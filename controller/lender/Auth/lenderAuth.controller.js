require("dotenv").config();
const { getEntityInstance } = require('../../../utils/uipath');

const roleEntityName = process.env.UIPATH_ROLE_ENTITY_NAME;

const getLenderRoles = async (req, res) => {
    try {
        const { email } = req.params;
        
        if (!email) {
            return res.status(400).json({ message: "Email parameter is required" });
        }

        // 1. Get the operational entity instance from our centralized utils
        const roleEntity = await getEntityInstance(roleEntityName);

        // 2. Fetch all records (SDK handles the auth and base path)
        const response = await roleEntity.getAllRecords();

        // 3. Find the user by email in the items array
        const userRecord = response.items.find(record => record.email === email);

        // 4. Extract the role, defaulting to an empty array if not found
        const role = userRecord ? (userRecord.role || []) : [];

        return res.status(200).json({ role });
    } catch (error) {
        console.error("Get roles error:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

module.exports = {
    getLenderRoles,
};