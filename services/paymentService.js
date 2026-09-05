

// const Settings = require('../models/Settings');
// const btcpayGateway = require('./gateway/btcpayGateway');
// const nowpaymentsGateway = require('./gateway/nowpaymentsGateway');
// const paystackGateway = require('./gateway/paystackGateway'); 
// // 1. Gateway Registry - Adding a new gateway in the future is just adding one line here.
// const gateways = {
//     'btcpay': btcpayGateway,
//     'nowpayments': nowpaymentsGateway,
//     'paystack': paystackGateway
// };


// // 2. Dynamic Provider Resolution (Strict Single Source of Truth from DB)
// const getActiveProvider = async () => {
//     const settings = await Settings.findOne({ singleton: 'main_settings' });
    
//     // Fallback to 'paystack' if settings document doesn't exist yet
//     const activeProvider = settings?.incomingPaymentProvider || 'paystack';
    
//     return activeProvider;
// };

// // 3. Dynamic Initialization
// const initializePayment = async (user, amount, currency = 'USD', orderId, metadata = {}, callbackUrl) => {
//     // Always resolve from Superadmin database settings (Single Source of Truth)
//     const providerName = await getActiveProvider();
//     const gateway = gateways[providerName];

//     if (!gateway) throw new Error(`Gateway ${providerName} is not implemented or configured in the registry.`);

//     const enrichedMetadata = { ...metadata, userId: user._id.toString(), provider: providerName };
    
//     const invoice = await gateway.initializeCryptoInvoice(user.email, amount, currency, orderId, enrichedMetadata, callbackUrl);
    
//     return { invoice, providerName }; 
// };

// // 4. Dynamic Verification
// const verifyPayment = async (invoiceId, providerName) => {
//     const gateway = gateways[providerName];
//     if (!gateway) throw new Error(`Gateway ${providerName} is not implemented.`);
    
//     return await gateway.verifyCryptoInvoice(invoiceId);
// };

// module.exports = { initializePayment, verifyPayment };


const Settings = require('../models/Settings');
const btcpayGateway = require('./gateway/btcpayGateway');
const nowpaymentsGateway = require('./gateway/nowpaymentsGateway');
const paystackGateway = require('./gateway/paystackGateway'); 

const gateways = {
    'btcpay': btcpayGateway,
    'nowpayments': nowpaymentsGateway,
    'paystack': paystackGateway
};

const getActiveProvider = async () => {
    const settings = await Settings.findOne({ singleton: 'main_settings' });
    const activeProvider = settings?.incomingPaymentProvider || 'paystack';
    return activeProvider;
};

const initializePayment = async (user, amount, currency = 'USD', orderId, metadata = {}, callbackUrl) => {
    const providerName = await getActiveProvider();
    const gateway = gateways[providerName];

    if (!gateway) throw new Error(`Gateway ${providerName} is not implemented or configured in the registry.`);

    const enrichedMetadata = { ...metadata, userId: user._id.toString(), provider: providerName };
    
    // Calls the standardized initializePayment function
    const invoice = await gateway.initializePayment(user.email, amount, currency, orderId, enrichedMetadata, callbackUrl);
    
    return { invoice, providerName }; 
};

const verifyPayment = async (invoiceId, providerName) => {
    const gateway = gateways[providerName];
    if (!gateway) throw new Error(`Gateway ${providerName} is not implemented.`);
    
    // Calls the standardized verifyPayment function
    return await gateway.verifyPayment(invoiceId);
};

module.exports = { initializePayment, verifyPayment };