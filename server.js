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
        //const paymentRoutes = require('./routes/paymentRoutes'); 

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

            // Both Passenger and Third-Party Payer join a room via tracking code
            socket.on('join_tracking_room', ({ trackingCode }) => {
                if (trackingCode) {
                    const roomName = `track_${trackingCode}`;
                    socket.join(roomName);
                    logger.info(`📍 Socket ${socket.id} joined room: ${roomName}`);
                }
            });

            // Passenger app emits location, server broadcasts to the payer
            socket.on('location_update', (data) => {
                const { trackingCode, lat, lng, speed, heading } = data;
                if (trackingCode) {
                    const roomName = `track_${trackingCode}`;
                    // socket.to() sends to everyone in the room EXCEPT the sender
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
        // app.use('/api/v1/payment', paymentRoutes);
        
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