require("dotenv").config();
const { getEntityInstance } = require('../../../utils/uipath');

const stateEntityName = process.env.UIPATH_BPROFILE_ENTITY_NAME;

/**
 * GET /borrower/stages/:borrowerId
 */
const getBorrowerStages = async (req, res) => {
    try {
        const { borrowerId } = req.params;
        const stagesEntity = await getEntityInstance(stateEntityName);

        // Fetch all records
        const response = await stagesEntity.getAllRecords();

        // Find the specific stage record for this borrower
        const stage = response.items.find(s => s.borrowerId === borrowerId);

        if (stage) {
            return res.status(200).json({ stage });
        } else {
            return res.status(404).json({ message: "Borrower stages not found" });
        }
    } catch (error) {
        console.error("Error fetching borrower stages:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * PUT /borrower/stages/:borrowerId
 */
const updateBorrowerStages = async (req, res) => {
    try {
        const { borrowerId } = req.params;
        const updatedData = req.body; // Expecting fields like { stageName: 'Verification', ... }
        
        const stagesEntity = await getEntityInstance(stateEntityName);

        // 1. First find the record to get its internal UiPath UUID (Id)
        const response = await stagesEntity.getAllRecords();
        const existingRecord = response.items.find(s => s.borrowerId === borrowerId);

        if (!existingRecord) {
            return res.status(404).json({ message: "Record not found to update" });
        }

        // 2. The SDK update method requires the internal 'Id' and an array format
        const updatePayload = [{
            ...updatedData,
            Id: existingRecord.id // Ensure the internal ID is included
        }];

        const result = await stagesEntity.updateRecords(updatePayload);

        return res.status(200).json({ message: "Stages updated", data: result });
    } catch (error) {
        console.error("Error updating borrower stages:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * POST /borrower/stages
 */
const createBorrowerStages = async (req, res) => {
    try {
        const stagesData = req.body;
        const stagesEntity = await getEntityInstance(stateEntityName);

        // Use SDK insert method for single record
        const result = await stagesEntity.insertRecord(stagesData);

        return res.status(201).json({ message: "Stages created", data: result });
    } catch (error) {
        console.error("Error creating borrower stages:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

module.exports = {
    getBorrowerStages,
    updateBorrowerStages,
    createBorrowerStages
};


// const axios = require("axios");
// require("dotenv").config();

// const BaseUrl = process.env.UIPATH_TOKEN_URL;
// const dft = process.env.UIPATH_TOKEN_SECRET;

// const stateEntity = process.env.UIPATH_BPROFILE_ENTITY_NAME;

// const getBorrowerStages = async (req, res) => {
//     try {
//         const { borrowerId } = req.params;
//         console.log(`Fetching stages for borrowerId: ${borrowerId}`);
//         const headers = { Authorization: `Bearer ${dft}` };

//         const response = await axios.get(`${BaseUrl}/${stateEntity}/read/${borrowerId}`, { headers });

//         if (response.data && response.data.value && response.data.value.length > 0) {
//             const stage = response.data.value[0];
//             console.log(`Stage for borrowerId ${borrowerId}:`, stage);
//             return res.status(200).json({ stage });
//         } else {
//             console.log(`No data found for borrowerId: ${borrowerId}`);
//             return res.status(404).json({ message: "Borrower not found" });
//         }
//     } catch (error) {
//         console.error("Error fetching borrower stages:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// const updateBorrowerStages = async (req, res) => {
//     try {
//         const { borrowerId } = req.params;
//         const updatedStages = req.body;
//         console.log(`Updating stages for borrowerId: ${borrowerId}`, updatedStages);
//         const headers = { Authorization: `Bearer ${dft}` };
//         const response = await axios.put(
//             `${BaseUrl}/${stateEntity}/update/${borrowerId}`,
//             updatedStages,
//             { headers }
//         );
//         console.log(`Updated stages for borrowerId ${borrowerId}:`, response.data);
//         return res.status(200).json({ message: "Stages updated", data: response.data });
//     } catch (error) {
//         console.error("Error updating borrower stages:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// const createBorrowerStages = async (req, res) => {
//     try {
//         const stagesData = req.body;
//         console.log("Creating stages for borrower:", stagesData);
//         const headers = { Authorization: `Bearer ${dft}` };
//         const response = await axios.post(
//             `${BaseUrl}/${stateEntity}/insert`,
//             stagesData,
//             { headers }
//         );
//         console.log("Created stages:", response.data);
//         return res.status(201).json({ message: "Stages created", data: response.data });
//     }
//     catch (error) {
//         console.error("Error creating borrower stages:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// module.exports = {
//     getBorrowerStages,
//     updateBorrowerStages,
//     createBorrowerStages
// };
