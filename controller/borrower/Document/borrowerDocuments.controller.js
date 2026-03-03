const axios = require("axios");
const FormData = require("form-data");

// Use the cleaned up Base URL
const BASE_API_URL = process.env.UIPATH_TOKEN_URL;
const DATA_FABRIC_TOKEN = process.env.UIPATH_TOKEN_SECRET;
const DOCUMENT_ENTITY = process.env.UIPATH_BDOCUMENT_ENTITY_NAME;

module.exports.uploadBorrowerDocuments = async (req, res) => {
    try {
        const { UserId } = req.body;

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }

        // STEP 1: Insert record
        // Correct path: .../api/EntityService/{EntityName}
        const insertUrl = `${BASE_API_URL}/${DOCUMENT_ENTITY}/insert`;
        // console.log("Hitting Insert URL:", insertUrl);

        const createResponse = await axios.post(
            insertUrl,
            { UserId: UserId },
            {
                headers: {
                    Authorization: `Bearer ${DATA_FABRIC_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Create Response Data:", createResponse.data);

        const recordId = createResponse.data.Id;
        const files = req.files;

        // STEP 2: Upload Files
        const uploadPromises = [];

        if (files?.DriversLicense?.[0]) {
            uploadPromises.push(
                uploadFileToUiPath(recordId, "DriversLicense", files.DriversLicense[0])
            );
        }

        if (files?.PayStub?.[0]) {
            uploadPromises.push(
                uploadFileToUiPath(recordId, "PayStub", files.PayStub[0])
            );
        }

        if (files?.ProfilePicture?.[0]) {
            uploadPromises.push(
                uploadFileToUiPath(recordId, "ProfilePicture", files.ProfilePicture[0])
            );
        }

        await Promise.all(uploadPromises);

        return res.status(200).json({
            success: true,
            uipathId: recordId
        });

    } catch (err) {
        // Log the detailed error from Axios if it exists
        if (err.response) {
            console.error("UiPath Error Data:", err.response.data);
            console.error("UiPath Error Status:", err.response.status);
        }
        console.error("DETAILED ERROR:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

async function uploadFileToUiPath(recordId, fieldName, fileObject) {
    const form = new FormData();
    form.append("file", fileObject.buffer, {
        filename: fileObject.originalname,
        contentType: fileObject.mimetype,
    });

    /**
     * CLEAN THE URL:
     * We need to ensure "EntityService" is NOT in the path for Attachments.
     * We take your BASE_API_URL and make sure it ends at /api
     */
    const cleanBaseUrl = process.env.UIPATH_TOKEN_URL.split('/EntityService')[0];

    const attachmentUrl = `${cleanBaseUrl}/Attachment/${DOCUMENT_ENTITY}/${recordId}/${fieldName}`;

    // console.log("Hitting Attachment URL:", attachmentUrl);

    return axios.post(
        attachmentUrl,
        form,
        {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${process.env.UIPATH_TOKEN_SECRET}`,
            },
        }
    );
}

module.exports.getBorrowerDocuments = async (req, res) => {
    try {
        const { borrowerId } = req.params;

        // STEP 1: Find the document record for this borrower
        const queryUrl = `${BASE_API_URL}/${DOCUMENT_ENTITY}/query`;
        const queryResponse = await axios.post(
            queryUrl,
            { filter: `UserId eq '${borrowerId}'` },
            {
                headers: {
                    Authorization: `Bearer ${DATA_FABRIC_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Query Response Data:", queryResponse.data);

        const record = queryResponse.data.value?.[0];

        if (!record) {
            return res.status(404).json({ success: false, message: "No documents found" });
        }

        const recordId = record.Id;

        console.log("Found document record ID:", recordId);
        // STEP 2: Return the URLs
        // We point these to a backend route that will stream the file from UiPath
        return res.status(200).json({
            success: true,
            data: {
                DriversLicense: record.DriversLicense ? `/api/borrower/documents/file/${recordId}/DriversLicense` : null,
                PayStub: record.PayStub ? `/api/borrower/documents/file/${recordId}/PayStub` : null,
                ProfilePicture: record.ProfilePicture ? `/api/borrower/documents/file/${recordId}/ProfilePicture` : null,
            }
        });

    } catch (err) {
        console.error("Fetch Doc Error:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports.streamDocumentFile = async (req, res) => {
    try {
        const { recordId, fieldName } = req.params;
        const cleanBaseUrl = process.env.UIPATH_TOKEN_URL.split('/EntityService')[0];
        
        const downloadUrl = `${cleanBaseUrl}/Attachment/${DOCUMENT_ENTITY}/${recordId}/${fieldName}`;

        const response = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream',
            headers: {
                Authorization: `Bearer ${DATA_FABRIC_TOKEN}`,
            }
        });

        // Pipe the UiPath stream directly to the frontend response
        response.data.pipe(res);
    } catch (err) {
        res.status(500).send("Error streaming file");
    }
};