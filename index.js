const express = require('express');
const cors = require('cors');
const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const bodyParser = require("body-parser");

// Original routes preserved
const borrowerRoutes = require('./routes/borrower/borrower.routes');
const lenderRoutes = require('./routes/lender/lender.routes');

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(session({
    secret: 'dfsf94835asda',
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// Route Middlewares
app.use('/api/borrower', borrowerRoutes);
app.use('/api/lender', lenderRoutes);

// --- DocuSign Auth Logic ---
async function checkToken(request) {
    if (request.session.access_token && Date.now() < request.session.expires_at) {
        return;
    } else {
        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
        const results = await dsApiClient.requestJWTUserToken(
            process.env.DOCUSIGN_INTEGRATION_KEY,
            process.env.DOCUSIGN_USER_ID,
            ["signature", "impersonation"],
            fs.readFileSync(path.join(__dirname, "private.key")),
            3600
        );
        request.session.access_token = results.body.access_token;
        request.session.expires_at = Date.now() + (results.body.expires_in - 60) * 1000;
    }
}

function getEnvelopesApi(request) {
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + request.session.access_token);
    return new docusign.EnvelopesApi(dsApiClient);
}

function makeEnvelope(name, email, company, amount) {
    let env = new docusign.EnvelopeDefinition();
    env.templateId = process.env.DOCUSIGN_TEMPLATE_ID;

    // 1. Map Text Fields using your NEW Data Labels
    let nameTab = docusign.Text.constructFromObject({ 
        tabLabel: "name", 
        value: name 
    });
    let companyTab = docusign.Text.constructFromObject({ 
        tabLabel: "company_name", 
        value: company 
    });
    let amountTab = docusign.Text.constructFromObject({ 
        tabLabel: "loan_amount", 
        value: `₹${amount}` 
    });

    let tabs = docusign.Tabs.constructFromObject({
        textTabs: [nameTab, companyTab, amountTab],
        // signHereTabs: [signHere]
    });

    // 3. Define the Recipient using the "Borrower" role
    let signer = docusign.TemplateRole.constructFromObject({
        email: email,
        name: name,
        tabs: tabs,
        clientUserId: process.env.CLIENT_USER_ID || '1001', // Essential for embedded signing
        roleName: 'Borrower' // Matches your screenshot image_bc60c0.png
    });

    env.templateRoles = [signer];
    env.status = "sent";
    return env;
}

function makeRecipientViewRequest(name, email) {
    let viewRequest = new docusign.RecipientViewRequest();
    // Use your network IP for the return URL
    viewRequest.returnUrl = "https://finance-process-app.netlify.app/api/docusign/callback";
    viewRequest.authenticationMethod = 'none';
    viewRequest.email = email;
    viewRequest.userName = name;
    viewRequest.clientUserId = process.env.CLIENT_USER_ID || '1001';
    return viewRequest;
}

// --- Main DocuSign Endpoint for the Borrower Dashboard ---
app.post('/api/docusign/create-session', async (req, res) => {
    try {
        await checkToken(req);
        const { name, email, company, amount } = req.body;
        
        let envelopesApi = getEnvelopesApi(req);
        let envelope = makeEnvelope(name, email, company, amount);

        let results = await envelopesApi.createEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, {
            envelopeDefinition: envelope
        });

        let viewRequest = makeRecipientViewRequest(name, email);
        let viewResults = await envelopesApi.createRecipientView(
            process.env.DOCUSIGN_ACCOUNT_ID, 
            results.envelopeId, 
            { recipientViewRequest: viewRequest }
        );

        res.json({ success: true, url: viewResults.url });
    } catch (error) {
        console.error("DocuSign Pre-fill Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/docusign/callback', (req, res) => {
    const event = req.query.event;
    console.log("Signing Event:", event);
    
    // This is a server-side redirect, which browsers trust more than an iframe redirect
    if (event === 'signing_complete') {
        res.redirect("https://finance-process-app-server-1.onrender.com/borrower/dashboard?status=success");
    } else {
        res.redirect("https://finance-process-app-server-1.onrender.com/borrower/dashboard?status=cancel");
    }
});

app.get("/success", (req, res) => res.redirect("https://finance-process-app.netlify.app/borrower/dashboard"));

app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://127.0.0.1:${port}`);
});