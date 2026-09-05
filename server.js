const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo').default || require('connect-mongo');

// --- Load Config & Connectors ---
const connectDB = require('./config/db');
const { notFound } = require('./middleware/errorMiddleware');
const logger = require('./config/logger');
const { globalLimiter } = require('./middleware/ratelimiters');

dotenv.config();

const startServer = async () => {
    try {
        await connectDB();

        // --- API Route Imports (Updated for CannonTravels) ---
        const authRoutes = require('./routes/authRoutes');
        const bookingRoutes = require('./routes/bookingRoutes'); 
        const cannonRoutes = require('./routes/cannonRoutes');
        const flightRoutes = require('./routes/flightRoutes');
        const paymentRoutes = require('./routes/paymentRoutes'); 
        const dashboardRoutes = require('./routes/dashboardRoutes');
        const transactionRoutes = require('./routes/transactionRoutes');
        const profileRoutes = require('./routes/profileRoutes');

        const app = express();
        const server = http.createServer(app);
        

        // 🟢 1. Socket.io Configuration (Real-Time Location & Payment Tracking)
        const io = new Server(server, {
            cors: { 
                origin: [
                    'http://localhost:3000',
                    process.env.FRONTEND_URL 
                ], 
                methods: ["GET", "POST"],
                credentials: true 
            },
            transports: ['websocket', 'polling'], 
            allowEIO3: true,
            pingInterval: 25000, 
            pingTimeout: 20000,  
        });

        app.set('socketio', io);

        // 🟢 2. Connection Handler for Real-Time Telemetry
        io.on('connection', (socket) => {
            logger.info(`🔌 Socket Connected: ${socket.id}`);

            socket.on('join_tracking_room', ({ trackingCode }) => {
                if (trackingCode) {
                    const roomName = `track_${trackingCode}`;
                    socket.join(roomName);
                    logger.info(`📍 Socket ${socket.id} joined room: ${roomName}`);
                }
            });

            socket.on('location_update', (data) => {
                const { trackingCode, lat, lng, speed, heading } = data;
                if (trackingCode) {
                    const roomName = `track_${trackingCode}`;
                    socket.to(roomName).emit('passenger_location', {
                        lat,
                        lng,
                        speed,
                        heading,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            socket.on('disconnect', (reason) => {
                logger.info(`🔴 Disconnect: ${socket.id} (${reason})`);
            });
        });

        // 🟢 3. Live Flight Radar Background Poller (OpenSky + Fallback Simulator)
        const { getLiveFlightPosition } = require('./services/liveFlightService');
        const Booking = require('./models/Booking');

        // In-memory tracker to keep simulated planes moving smoothly during tests
        const simulatedPositions = new Map();

        setInterval(async () => {
            try {
                // Find all paid bookings currently being tracked
                const activeBookings = await Booking.find({ paymentStatus: 'paid' }).select('trackingCode flightNumber');
                
                for (const booking of activeBookings) {
                    if (!booking.trackingCode) continue;

                    const roomName = `track_${booking.trackingCode}`;
                    let liveData = await getLiveFlightPosition(booking.flightNumber);

                    // Fallback: If OpenSky has no record of this test flight, simulate smooth movement
                    if (!liveData) {
                        let current = simulatedPositions.get(booking.trackingCode) || { 
                            lat: 6.5244, // Starts near Lagos
                            lng: 3.3792, 
                            heading: 65, 
                            speed: 480, 
                            altitude: 36000 
                        };
                        
                        // Increment coordinates slightly every 3 seconds to simulate flight progress
                        current.lat += 0.002;
                        current.lng += 0.004;
                        current.heading = (current.heading + 1) % 360;

                        simulatedPositions.set(booking.trackingCode, current);
                        liveData = { ...current };
                    }

                    // Broadcast real or simulated coordinates to everyone in the tracking room
                    io.to(roomName).emit('passenger_location', {
                        lat: liveData.lat,
                        lng: liveData.lng,
                        speed: liveData.speed || 480,
                        heading: liveData.heading || 90,
                        altitude: liveData.altitude || 36000,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error("Background Radar Polling Error:", err.message);
            }
        }, 3000); // Broadcasts updates every 3 seconds for smooth visual radar testing

        
        // --- Express Middlewares ---
        app.set('trust proxy', 1);
        app.use(helmet());
        app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

        const allowedOrigins = [
            'http://localhost:3000',
            process.env.FRONTEND_URL
        ];

        app.use(cors({
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS')); 
                }
            },
            credentials: true,
        }));

        // Webhook parser requirement: Paystack/Stripe usually require raw bodies for signature verification.
        // We use JSON for everything EXCEPT the webhook route.
        app.use('/api/v1/payment/webhook', express.raw({ type: 'application/json' }));
        app.use(express.json({ limit: '10mb' })); 
        app.use(express.urlencoded({ extended: false }));
        app.use(cookieParser());

        // --- Session Management ---
        app.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
            }
        }));

        app.use(passport.initialize());
        require('./config/passport-setup');

        // --- Routes ---
        app.get('/health', (req, res) => res.status(200).json({ status: 'UP', environment: process.env.NODE_ENV }));

        // --- API Mounting ---
        app.use('/api/v1', globalLimiter);
        app.use('/api/v1/auth', authRoutes);
        app.use('/api/v1/bookings', bookingRoutes);
        app.use('/api/v1/cannon', cannonRoutes);
        app.use('/api/v1/flights', flightRoutes);
        app.use('/api/v1/payments', paymentRoutes);
        app.use('/api/v1/dashboard', dashboardRoutes);
        app.use('/api/v1/transactions', transactionRoutes);
        app.use('/api/v1/profile', profileRoutes);
        
        app.use(notFound);

        // --- Global Error Handler ---
        app.use((err, req, res, next) => {
            const statusCode = err.status || (res.statusCode === 200 ? 500 : res.statusCode);
            
            logger.error(`🔥 ERROR: ${err.message}`);
            if (statusCode === 500) {
                logger.error(err.stack); 
            }

            res.status(statusCode).json({
                success: false,
                message: err.message, 
                stack: process.env.NODE_ENV === 'production' ? null : err.stack,
            });
        });

        // --- Start Server ---
        const PORT = process.env.PORT || 5001;
        server.listen(PORT, () => {
            logger.info(`🚀 CannonTravels Core running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });

    } catch (error) {
        logger.error('💥 Failed to start server', error);
        process.exit(1);
    }
};

startServer();