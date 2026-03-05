require('dotenv').config();
const axios = require('axios');
const { getEntityInstance, entitiesService } = require('../../../utils/uipath');

const profileEntityName = process.env.UIPATH_BPROFILE_ENTITY_NAME;

const submitBorrowerProfile = async (req, res) => {
    try {
        const profileData = req.body;
        // Assuming your frontend sends borrowerId inside profileData
        const UserId = profileData.UserId;
        console.log("Received profile data:", profileData);

        if (!UserId) {
            return res.status(400).json({ message: 'UserId is required to identify the profile' });
        }

        // 1. Get the operational entity instance
        const profileEntityMetadata = await getEntityInstance(profileEntityName);
        console.log("Profile entity metadata:", profileEntityMetadata);
        const entityUuid = profileEntityMetadata.id;
        // 2. Fetch all records to find if this borrower already exists
        const response = await entitiesService.getAllRecords(entityUuid);
        console.log(`All profiles retrieved:`, response);
        const existingRecord = response.items.find(p => p.UserId === UserId);
        let result;

        if (existingRecord) {
            console.log("Record found. Performing Update for ID:", existingRecord.Id);

            // 3. UPDATE: Must use updateRecordsById with an ARRAY
            // Each object in the array MUST contain the 'Id'
            const updatePayload = [{
                ...profileData,
                Id: existingRecord.Id // Ensure the system GUID is included
            }];

            result = await entitiesService.updateRecordsById(entityUuid, updatePayload);

            return res.status(200).json({
                message: 'Profile updated successfully',
                data: result
            });
        } else {
            console.log("No record found. Performing Insert.");

            // 4. INSERT: Use insertRecordById for a single record
            result = await entitiesService.insertRecordById(entityUuid, profileData);

            return res.status(201).json({
                message: 'Profile created successfully',
                data: result
            });
        }
    } catch (error) {
        console.error('Submit profile error:', error);
        return res.status(500).json({ message: error.message || 'Internal Server error' });
    }
}

const getBorrowerProfile = async (req, res) => {
    try {
        const { borrowerId } = req.params;  
        if (!borrowerId) {
            return res.status(400).json({ message: 'Borrower ID is required' });
        }

        // 1. Get the operational entity instance from utils
        const profileEntity = await getEntityInstance(profileEntityName);

        // 2. Retrieve all records
        const response = await profileEntity.getAllRecords();
        console.log(`All profiles retrieved:`, response);
        // 3. Find specific profile by borrowerId field
        const profile = response.items.find(p => p.UserId === borrowerId);
        console.log(`Profile for borrowerId ${borrowerId}:`, profile);

        if (profile) {  
            return res.status(200).json({ 
                message: 'Profile retrieved successfully', 
                data: profile 
            });
        } else {
            return res.status(404).json({ message: 'Profile not found' });
        }   
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ message: error.message || 'Internal Server error' });
    }
}

module.exports = {
    submitBorrowerProfile,
    getBorrowerProfile
};