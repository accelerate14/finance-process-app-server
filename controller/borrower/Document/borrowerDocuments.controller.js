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
        const insertUrl = `${BASE_API_URL}/${DOCUMENT_ENTITY}/insert`;

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

        const recordId = createResponse.data.Id;
        const files = req.files;

        // STEP 2: Upload Files
        const uploadPromises = [];

        // Upload Driver's License if exists
        if (files?.DriversLicense?.[0]) {
            uploadPromises.push(
                uploadFileToUiPath(recordId, "DriversLicense", files.DriversLicense[0])
            );
        }

        // Upload Pay Stub if exists
        if (files?.PayStub?.[0]) {
            uploadPromises.push(
                uploadFileToUiPath(recordId, "PayStub", files.PayStub[0])
            );
        }

        // Note: ProfilePicture logic has been removed from here

        await Promise.all(uploadPromises);

        return res.status(200).json({
            success: true,
            uipathId: recordId
        });

    } catch (err) {
        if (err.response) {
            console.error("UiPath Error Data:", err.response.data);
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

    const cleanBaseUrl = process.env.UIPATH_TOKEN_URL.split('/EntityService')[0];
    const attachmentUrl = `${cleanBaseUrl}/Attachment/${DOCUMENT_ENTITY}/${recordId}/${fieldName}`;

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

        const record = queryResponse.data.value?.[0];

        if (!record) {
            return res.status(404).json({ success: false, message: "No documents found" });
        }

        const recordId = record.Id;

        return res.status(200).json({
            success: true,
            data: {
                DriversLicense: record.DriversLicense ? `/api/borrower/documents/file/${recordId}/DriversLicense` : null,
                PayStub: record.PayStub ? `/api/borrower/documents/file/${recordId}/PayStub` : null,
                // ProfilePicture removed from the return object
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

        response.data.pipe(res);
    } catch (err) {
        res.status(500).send("Error streaming file");
    }
};