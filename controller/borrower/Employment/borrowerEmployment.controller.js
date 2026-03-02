const axios = require("axios");
require("dotenv").config();
const { getEntityInstance } = require('../../../utils/uipath');

const employmentEntityName = process.env.UIPATH_BEMPLOYMENT_ENTITY_NAME;

const submitEmploymentInfo = async (req, res) => {
  try {
    const employmentData = req.body;

    if (!employmentData.UserId) {
      return res.status(400).json({ message: "Borrower ID is required" });
    }

    // 1. Get the operational entity instance from utils
    const employmentEntity = await getEntityInstance(employmentEntityName);

    // 2. Use the SDK's insertRecord method
    const result = await employmentEntity.insertRecord(employmentData);

    return res.status(201).json({
      message: "Employment info saved",
      data: result,
    });
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