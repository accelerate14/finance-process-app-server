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

    // 2. Map Signature Field using Anchor Tagging
    // This looks for the text "Signature" in your file and places the box there automatically
    // let signHere = docusign.SignHere.constructFromObject({
    //     anchorString: 'Signature',
    //     anchorYOffset: '-10', // Adjusts position slightly above the line
    //     anchorUnits: 'pixels',
    //     anchorXOffset: '20'
    // });

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
    viewRequest.returnUrl = "http://127.0.0.1:3000/api/docusign/callback";
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
        res.redirect("http://127.0.0.1:5173/borrower/dashboard?status=success");
    } else {
        res.redirect("http://127.0.0.1:5173/borrower/dashboard?status=cancel");
    }
});

app.get("/success", (req, res) => res.redirect("http://127.0.0.1:5173/borrower/dashboard"));

app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://127.0.0.1:${port}`);
});

// const express = require('express');
// const cors = require('cors');
// const docusign = require('docusign-esign');
// const fs = require('fs');
// const path = require('path');
// const dotenv = require('dotenv');
// const session = require('express-session');

// // Import your existing routes
// const borrowerRoutes = require('./routes/borrower/borrower.routes');
// const lenderRoutes = require('./routes/lender/lender.routes');

// dotenv.config();

// const app = express();
// const port = process.env.PORT || 3000;

// app.use(express.json());
// app.use(cors());
// app.use(session({
//     secret: 'your_secret_key',
//     resave: false,
//     saveUninitialized: true,
//     cookie: { secure: false } // Set to true if using HTTPS
// }));

// // --- Existing Routes ---
// app.use('/api/borrower', borrowerRoutes);
// app.use('/api/lender', lenderRoutes);

// // --- DocuSign Helper Functions ---

// async function checkToken(req) {
//     if (req.session.access_token && req.session.expires_at > Date.now()) {
//         return req.session.access_token;
//     }
    
//     let dsApiClient = new docusign.ApiClient();
//     dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
//     const results = await dsApiClient.requestJWTUserToken(
//         process.env.DOCUSIGN_INTEGRATION_KEY,
//         process.env.DOCUSIGN_USER_ID,
//         ["signature", "impersonation"],
//         fs.readFileSync(path.join(__dirname, "private.key")),
//         3600
//     );
    
//     req.session.access_token = results.body.access_token;
//     req.session.expires_at = Date.now() + (results.body.expires_in - 60) * 1000;
//     return results.body.access_token;
// }

// function makeEnvelope(name, email, company, amount) {
//     let env = new docusign.EnvelopeDefinition();
//     env.templateId = process.env.DOCUSIGN_TEMPLATE_ID;

//     // Matching your screenshot labels exactly
//     let nameTab = docusign.Text.constructFromObject({ tabLabel: 'name', value: name });
//     let companyTab = docusign.Text.constructFromObject({ tabLabel: 'company_name', value: company });
//     let amountTab = docusign.Text.constructFromObject({ tabLabel: 'loan_amount', value: `₹${amount}` });

//     let tabs = docusign.Tabs.constructFromObject({
//         textTabs: [nameTab, companyTab, amountTab]
//     });

//     let signer = docusign.TemplateRole.constructFromObject({
//         email: email,
//         name: name,
//         clientUserId: process.env.CLIENT_USER_ID || 'borrower_1', 
//         tabs: tabs,
//         roleName: 'Borrower', // Ensure this matches your template role name
//     });

//     env.templateRoles = [signer];
//     env.status = 'sent';
//     return env;
// }

// function makeRecipientViewRequest(name, email) {
//     let viewRequest = new docusign.RecipientViewRequest();
//     viewRequest.returnUrl = `${process.env.FRONTEND_URL || 'http://192.168.1.125:5173'}/borrower/dashboard?status=success`;
//     viewRequest.authenticationMethod = 'none';
//     viewRequest.email = email;
//     viewRequest.userName = name;
//     viewRequest.clientUserId = process.env.CLIENT_USER_ID || 'borrower_1';
//     return viewRequest;
// }

// // --- API Endpoints ---

// app.post('/api/docusign/create-session', async (req, res) => {
//     try {
//         const { name, email, company, amount } = req.body;
//         const token = await checkToken(req);

//         let dsApiClient = new docusign.ApiClient();
//         dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
//         dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + token);
//         const envelopesApi = new docusign.EnvelopesApi(dsApiClient);

//         // 1. Create Envelope
//         let envelope = makeEnvelope(name, email, company, amount);
//         let results = await envelopesApi.createEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, { envelopeDefinition: envelope });
        
//         // 2. Create Recipient View
//         let viewRequest = makeRecipientViewRequest(name, email);
//         let viewResults = await envelopesApi.createRecipientView(process.env.DOCUSIGN_ACCOUNT_ID, results.envelopeId, { recipientViewRequest: viewRequest });

//         res.json({ success: true, url: viewResults.url });
//     } catch (error) {
//         console.error('DocuSign Session Error:', error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// app.get('/success', (req, res) => {
//     res.send('<h1>Signing Complete!</h1><p>You can close this window.</p>');
// });

// app.listen(port, "0.0.0.0", () => {
//     console.log(`Server is running on http://192.168.1.125:${port}`);
// });

// // const express = require('express');
// // const cors = require('cors');
// // const docusign = require('docusign-esign');
// // const fs = require('fs');
// // const path = require('path');
// // const dotenv = require('dotenv');
// // const session = require('express-session');

// // dotenv.config();

// // const app = express();
// // app.use(express.json());
// // app.use(cors());
// // app.use(session({
// //     secret: 'secret_key_accelifinance',
// //     resave: false,
// //     saveUninitialized: true,
// //     cookie: { secure: false }
// // }));

// // // Helper: Check/Refresh DocuSign JWT Token
// // async function getDSAccessToken(req) {
// //     if (req.session.ds_token && req.session.ds_expires > Date.now()) {
// //         return req.session.ds_token;
// //     }

// //     const dsApiClient = new docusign.ApiClient();
// //     dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
    
// //     const results = await dsApiClient.requestJWTUserToken(
// //         process.env.DOCUSIGN_INTEGRATION_KEY,
// //         process.env.DOCUSIGN_USER_ID,
// //         ["signature", "impersonation"],
// //         fs.readFileSync(path.join(__dirname, "private.key")),
// //         3600
// //     );

// //     req.session.ds_token = results.body.access_token;
// //     req.session.ds_expires = Date.now() + (results.body.expires_in - 60) * 1000;
// //     return results.body.access_token;
// // }

// // // Route to Generate signing URL for the Borrower
// // app.post('/api/docusign/create-session', async (req, res) => {
// //     try {
// //         const { name, email, loanId, amount } = req.body;
// //         const accessToken = await getDSAccessToken(req);

// //         const dsApiClient = new docusign.ApiClient();
// //         dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
// //         dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
// //         const envelopesApi = new docusign.EnvelopesApi(dsApiClient);

// //         // 1. Define the Envelope from Template
// //         const env = new docusign.EnvelopeDefinition();
// //         env.templateId = process.env.DOCUSIGN_TEMPLATE_ID;

// //         // Populate Template Tabs
// //         const tabs = docusign.Tabs.constructFromObject({
// //             textTabs: [
// //                 { tabLabel: 'loan_id', value: loanId },
// //                 { tabLabel: 'loan_amount', value: `$${amount}` }
// //             ]
// //         });

// //         const signer = docusign.TemplateRole.constructFromObject({
// //             email: email,
// //             name: name,
// //             roleName: 'Borrower', // Must match role in template
// //             clientUserId: 'borrower_embedded_1', // Makes it embedded
// //             tabs: tabs
// //         });

// //         env.templateRoles = [signer];
// //         env.status = 'sent';

// //         // 2. Create the Envelope
// //         const results = await envelopesApi.createEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, { envelopeDefinition: env });

// //         // 3. Create the Recipient View (The URL for the Iframe)
// //         const viewRequest = new docusign.RecipientViewRequest();
// //         viewRequest.returnUrl = `${process.env.FRONTEND_URL}/borrower/dashboard?event=signed`;
// //         viewRequest.authenticationMethod = 'none';
// //         viewRequest.email = email;
// //         viewRequest.userName = name;
// //         viewRequest.clientUserId = 'borrower_embedded_1';

// //         const viewResults = await envelopesApi.createRecipientView(process.env.DOCUSIGN_ACCOUNT_ID, results.envelopeId, { recipientViewRequest: viewRequest });

// //         res.json({ success: true, url: viewResults.url });
// //     } catch (error) {
// //         console.error("DocuSign Session Error:", error);
// //         res.status(500).json({ success: false, message: error.message });
// //     }
// // });

// // const PORT = process.env.PORT || 3000;
// // app.listen(PORT, "0.0.0.0", () => console.log(`Backend running on port ${PORT}`));

// // const express = require('express');
// // const app = express();
// // const port = process.env.PORT || 3000;
// // const borrowerRoutes = require('./routes/borrower/borrower.routes');
// // const lenderRoutes = require('./routes/lender/lender.routes');
// // const cors = require('cors');
// // const axios = require('axios');
// // const docusign = require('docusign-esign');
// // const fs = require('fs');
// // const path = require('path');
// // const dotenv = require('dotenv');
// // const session = require('express-session');

// // dotenv.config();

// // app.use(session({
// //   secret: 'your_secret_key',
// //   resave: false,
// //   saveUninitialized: true,
// //   cookie: { secure: false } // Set to true if using HTTPS
// // }));

// // app.use(express.json());
// // app.use(cors());

// // async function getEnvelopesApi(req) {
// //   let dsApiClient = new docusign.ApiClient();
// //   dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
// //   dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.session.access_token);
// //   return new docusign.EnvelopesApi(dsApiClient);
// // }

// // function makeEnvelope(name, email, company, amount) {
// //   // Data for this method
// //   // args.signerEmail
// //   // args.signerName
// //   // args.ccEmail
// //   // args.ccName
// //   // args.templateId

// //   // The envelope has two recipients.
// //   // recipient 1 - signer
// //   // recipient 2 - cc

// //   // create the envelope definition
// //   let env = new docusign.EnvelopeDefinition();
// //   env.templateId = process.env.DOCUSIGN_TEMPLATE_ID;

// //   let text = docusign.Text.constructFromObject({
// //     tabLabel: 'company_name',
// //     value: company,
// //   });

// //   let number = docusign.Text.constructFromObject({
// //     tabLabel: 'loan_amount',
// //     value: amount,
// //   });

// //   // Create template role elements to connect the signer and cc recipients
// //   // to the template
// //   // We're setting the parameters via the object creation
// //   let tabs = new docusign.Tabs({
// //     textTabs: [text, number],
// //   });

// //   let signer1 = docusign.TemplateRole.constructFromObject({
// //     email: email,
// //     name: name,
// //     clientUserId: process.env.CLIENT_USER_ID, // Used to indicate that the signer will use embedded signing. Must be the same as the clientUserId used in the recipient view request.
// //     tabs: tabs,
// //     roleName: 'Underwriter',
// //   });

// //   // Create a cc template role.
// //   // We're setting the parameters via setters
// //   // let cc1 = new docusign.TemplateRole();
// //   // cc1.email = args.ccEmail;
// //   // cc1.name = args.ccName;
// //   // cc1.roleName = 'cc';

// //   // Add the TemplateRole objects to the envelope object
// //   // env.templateRoles = [signer1, cc1];
// //   env.templateRoles = [signer1];
// //   env.status = 'sent'; // We want the envelope to be sent

// //   return env;
// // }

// // app.use('/api/borrower', borrowerRoutes);
// // app.use('/api/lender', lenderRoutes);

// // app.post('/form', async (req, res) => {
// //   try {
// //     const { name, email, company, amount } = req.body;
// //     const sendEnvelopeFromTemplate = async (args) => {
// //       // Data for this method
// //       // args.basePath
// //       // args.accessToken
// //       // args.accountId

// //       // let dsApiClient = new docusign.ApiClient();
// //       // dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
// //       // dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.session.access_token);
// //       let envelopesApi = await getEnvelopesApi(req);

// //       // Make the envelope request body
// //       let envelope = makeEnvelope(name, email, company, amount);

// //       // Call the Envelopes::create API method
// //       // Exceptions will be caught by the calling function
// //       let results = await envelopesApi.createEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, {
// //         envelopeDefinition: envelope,
// //       }, (error, data, response) => {
// //         const headers = response?.headers;

// //         const remaining = headers?.['x-ratelimit-remaining'];
// //         const reset = headers?.['x-ratelimit-reset'];

// //         if (remaining && reset) {
// //           const resetInstant = new Date(Number(reset) * 1000);

// //           console.log(`API calls remaining: ${remaining}`);
// //           console.log(`Next Reset: ${resetInstant.toISOString()}`);
// //         }
// //       });

// //       console.log('Envelope creation results:', results);




// //       let viewRequest = makeRecipientViewRequest(name, email, process.env.CLIENT_USER_ID);
// //       // Call the CreateRecipientView API
// //       // Exceptions will be caught by the calling function
// //       results = await envelopesApi.createRecipientView(process.env.DOCUSIGN_ACCOUNT_ID, results.envelopeId, {
// //         recipientViewRequest: viewRequest,
// //       }, (error, data, response) => {
// //         const headers = response?.headers;

// //         const remaining = headers?.['x-ratelimit-remaining'];
// //         const reset = headers?.['x-ratelimit-reset'];

// //         if (remaining && reset) {
// //           const resetInstant = new Date(Number(reset) * 1000);

// //           console.log(`API calls remaining: ${remaining}`);
// //           console.log(`Next Reset: ${resetInstant.toISOString()}`);
// //         }
// //       });

// //       console.log('Recipient view creation results:', results);

// //       console.log({ envelopeId: results.envelopeId, redirectUrl: results.data.url });

// //       res.send({ success: true, message: 'Form submitted and envelope sent successfully!' });
// //     };
// //   } catch (error) {
// //     console.error('Error processing form submission:', error);
// //     res.status(500).send('An error occurred while processing your request.');
// //   }
// // });

// // app.get('/', async (req, res) => {
// //   if (req.session.access_token && req.session.expires_at > Date.now()) {
// //     console.log("resuming session with access token", req.session.access_token);
// //     res.send({ access_token: req.session.access_token, expires_in: (req.session.expires_at - Date.now()) / 1000 });
// //     return;
// //   } else {
// //     let dsApiClient = new docusign.ApiClient();
// //     dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
// //     const results = await dsApiClient.requestJWTUserToken(process.env.DOCUSIGN_INTEGRATION_KEY, process.env.DOCUSIGN_USER_ID, "signature", fs.readFileSync(path.join(__dirname, "private.key")), 3600);

// //     dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + results.access_token);
// //     // let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
// //     console.log("results", results.body);
// //     req.session.access_token = results.body.access_token; // Store access token in session
// //     req.session.expires_at = Date.now() + (results.body.expires_in - 60) * 1000; // Store expiration time in session
// //     res.send(results.body);
// //   }
// // });

// // function createTabs() {
// //   let list1 = docusign.List.constructFromObject({
// //     value: 'green',
// //     documentId: '1',
// //     pageNumber: '1',
// //     tabLabel: 'list',
// //   });

// //   // Checkboxes
// //   // let check1 = docusign.Checkbox.constructFromObject({
// //   //   tabLabel: 'ckAuthorization',
// //   //   selected: 'true',
// //   // });
// //   // let check3 = docusign.Checkbox.constructFromObject({
// //   //   tabLabel: 'ckAgreement',
// //   //   selected: 'true',
// //   // });
// //   // The NOde.js SDK has a bug so it cannot create a Number tab at this time.
// //   // number1 = docusign.Number.constructFromObject({
// //   //    tabLabel: "numbersOnly", value: '54321'});
// //   // let radioGroup = docusign.RadioGroup.constructFromObject({
// //   //   groupName: 'radio1',
// //   //   // You only need to provide the radio entry for the entry you're selecting
// //   //   radios: [
// //   //     docusign.Radio.constructFromObject({ value: 'white', selected: 'true' }),
// //   //   ],
// //   // });
  

// //   // We can also add a new tab (field) to the ones already in the template:
// //   // let textExtra = docusign.Text.constructFromObject({
// //   //   document_id: '1',
// //   //   page_number: '1',
// //   //   x_position: '280',
// //   //   y_position: '172',
// //   //   font: 'helvetica',
// //   //   font_size: 'size14',
// //   //   tab_label: 'added text field',
// //   //   height: '23',
// //   //   width: '84',
// //   //   required: 'false',
// //   //   bold: 'true',
// //   //   value: args.signerName,
// //   //   locked: 'false',
// //   //   tab_id: 'name',
// //   // });

// //    // Pull together the existing and new tabs in a Tabs object:
// //   let tabs = docusign.Tabs.constructFromObject({
// //     textTabs: [text, number],
// //   });
// //   // Create the template role elements to connect the signer and cc recipients
// //   // to the template
// //   let signer = docusign.TemplateRole.constructFromObject({
// //     email: args.signerEmail,
// //     name: args.signerName,
// //     roleName: 'signer',
// //     clientUserId: args.signerClientId, // change the signer to be embedded
// //     tabs: tabs, // Set tab values
// //   });
// //   // Create a cc template role.
// //   let cc = docusign.TemplateRole.constructFromObject({
// //     email: args.ccEmail,
// //     name: args.ccName,
// //     roleName: 'cc',
// //   });
// //   // Add the TemplateRole objects to the envelope object
// //   envelopeDefinition.templateRoles = [signer, cc];
// //   // Create an envelope custom field to save the our application's
// //   // data about the envelope
// //   let customField = docusign.TextCustomField.constructFromObject({
// //     name: 'app metadata item',
// //     required: 'false',
// //     show: 'true', // Yes, include in the CoC
// //     value: '1234567',
// //   });
// //   let customFields = docusign.CustomFields.constructFromObject({
// //     textCustomFields: [customField],
// //   });
// //   envelopeDefinition.customFields = customFields;

// //   return envelopeDefinition;
// // }

// // function makeRecipientViewRequest(name, email, client_id) {
// //   // Data for this method
// //   // args.dsReturnUrl
// //   // args.signerEmail
// //   // args.signerName
// //   // args.signerClientId
// //   // args.dsPingUrl

// //   let viewRequest = new docusign.RecipientViewRequest();

// //   // Set the url where you want the recipient to go once they are done signing
// //   // should typically be a callback route somewhere in your app.
// //   // The query parameter is included as an example of how
// //   // to save/recover state information during the redirect to
// //   // the DocuSign signing. It's usually better to use
// //   // the session mechanism of your web framework. Query parameters
// //   // can be changed/spoofed very easily.
// //   viewRequest.returnUrl = 'http://127.0.0.1:3000/success';

// //   // How has your app authenticated the user? In addition to your app's
// //   // authentication, you can include authenticate steps from DocuSign.
// //   // Eg, SMS authentication
// //   viewRequest.authenticationMethod = 'none';

// //   // Recipient information must match embedded recipient info
// //   // we used to create the envelope.
// //   viewRequest.email = email;
// //   viewRequest.userName = name;
// //   viewRequest.clientUserId = process.env.CLIENT_USER_ID;

// //   // DocuSign recommends that you redirect to DocuSign for the
// //   // embedded signing. There are multiple ways to save state.
// //   // To maintain your application's session, use the pingUrl
// //   // parameter. It causes the DocuSign signing web page
// //   // (not the DocuSign server) to send pings via AJAX to your
// //   // app,
// //   // viewRequest.pingFrequency = 600; // seconds
// //   // NOTE: The pings will only be sent if the pingUrl is an https address
// //   // viewRequest.pingUrl = args.dsPingUrl; // optional setting

// //   return viewRequest;
// // }


// // //  SERVER/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=CLIENT_ID&redirect_uri=REDIRECT_URI

// // //  https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=70b1cbea-1d84-4be3-bc4a-08fd6e242f50&redirect_uri=http://127.0.0.1:3000/

// // //  https://account-d.docusign.com/

// // app.get('/success', (req, res) => {
// //   res.send('success')
// // })


// // app.listen(port, "0.0.0.0", () => {
// //   console.log(`Server is running on http://127.0.0.1:${port}`);
// // });