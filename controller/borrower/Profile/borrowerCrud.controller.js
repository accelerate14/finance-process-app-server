require('dotenv').config();
const axios = require('axios');
const { getEntityInstance } = require('../../../utils/uipath');

const profileEntityName = process.env.UIPATH_BPROFILE_ENTITY_NAME;

const submitBorrowerProfile = async (req, res) => {
    try {
        const profileData = req.body;
        console.log("Received profile data:", profileData);

        if (!profileData || Object.keys(profileData).length === 0) {
            return res.status(400).json({ message: 'Profile data is required' });
        }

        // 1. Get the operational entity instance from utils
        const profileEntity = await getEntityInstance(profileEntityName);

        // 2. Use SDK insert method
        const result = await profileEntity.insertRecord(profileData);

        console.log("SDK response:", result);
        return res.status(201).json({ 
            message: 'Profile submitted successfully', 
            data: result 
        });
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
        const profile = response.items.find(p => p.Id === borrowerId);
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