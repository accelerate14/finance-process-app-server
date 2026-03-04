const axios = require("axios");
require("dotenv").config();
const { getEntityInstance, entitiesService } = require('../../../utils/uipath');

const employmentEntityName = process.env.UIPATH_BEMPLOYMENT_ENTITY_NAME;

const submitEmploymentInfo = async (req, res) => {
  try {
    const employmentData = req.body;
    const userId = employmentData.UserId;

    if (!userId) {
      return res.status(400).json({ message: "Borrower ID (UserId) is required" });
    }

    // 1. Get the Entity Metadata to retrieve the Entity UUID
    const employmentEntityMetadata = await getEntityInstance(employmentEntityName);
    const entityUuid = employmentEntityMetadata.id;

    // 2. Fetch all records to see if this user already has employment info
    // Note: entitiesService is your imported @uipath/uipath-typescript/entities instance
    const response = await entitiesService.getAllRecords(entityUuid);
    const existingRecord = response.items.find(rec => rec.UserId === userId);

    let result;

    if (existingRecord) {
      console.log(`Updating employment record for UserId: ${userId}`);

      // 3. UPDATE: Must be an array, and MUST include the system 'Id'
      const updatePayload = [{
        ...employmentData,
        Id: existingRecord.Id 
      }];

      result = await entitiesService.updateRecordsById(entityUuid, updatePayload);

      return res.status(200).json({
        message: "Employment info updated successfully",
        data: result,
      });
    } else {
      console.log(`Creating new employment record for UserId: ${userId}`);

      // 4. INSERT: Single record insertion
      result = await entitiesService.insertRecordById(entityUuid, employmentData);

      return res.status(201).json({
        message: "Employment info saved successfully",
        data: result,
      });
    }
  } catch (error) {
    console.error("Employment submit error:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

const getEmploymentInfo = async (req, res) => {
  try {
    const { borrowerId } = req.params;

    // 1. Get the operational entity instance from utils
    const employmentEntity = await getEntityInstance(employmentEntityName);

    // 2. Use the SDK's getAllRecords method
    const response = await employmentEntity.getAllRecords();

    // 3. Find the record by borrowerId in the items array
    const record = response.items.find((e) => e.UserId === borrowerId);

    if (!record) {
      return res.status(404).json({ message: "Employment info not found" });
    }

    return res.status(200).json({ data: record });
  } catch (error) {
    console.error("Get employment error:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

module.exports = {
  submitEmploymentInfo,
  getEmploymentInfo,
};