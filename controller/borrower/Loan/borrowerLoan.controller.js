require("dotenv").config();
const { getEntityInstance } = require('../../../utils/uipath');


const loanEntityName = process.env.UIPATH_BLOAN_ENTITY_NAME;

const submitLoanApplication = async (req, res) => {
  try {
    const loanData = req.body;
    console.log("Received loan application data:", loanData);

    if (!loanData.UserId) {
      return res.status(400).json({ message: "Borrower ID required" });
    }

    // Add metadata/status as you were doing before
    const payload = {
      ...loanData,
      CaseId: `Case-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    console.log("Payload to insert into UiPath:", payload);

    const loanEntity = await getEntityInstance(loanEntityName);
    
    // SDK insert method (handles headers and base URL internally)
    const result = await loanEntity.insertRecord(payload);

    return res.status(201).json({
      message: "Loan application submitted",
      data: result,
    });
  } catch (error) {
    console.error("Loan submit error:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * GET /borrower/loan/:borrowerId (Filters all loans for a borrower)
 */
const getLoanApplication = async (req, res) => {
  try {
    const { borrowerId } = req.params;
    console.log("Fetching loans for borrowerId:", borrowerId);
    const loanEntity = await getEntityInstance(loanEntityName);

    // Fetch all records - returns an object with an 'items' array
    const response = await loanEntity.getAllRecords();

    // SDK uses camelCase for properties usually, check your entity definition
    const loans = response.items.filter((l) => l.UserId === borrowerId);
    console.log(`Loans found for borrowerId ${borrowerId}:`, loans);
    if (!loans || loans.length === 0) {
      return res.status(404).json({ message: "No loans found for this borrower" });
    }

    return res.status(200).json({ data: loans });
  } catch (error) {
    console.error("Get loan error:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * GET /borrower/loan/detail/:loanId (Fetches one specific record by its UUID)
 */
const getLoanApplicationById = async (req, res) => {
  try {
    const { loanId } = req.params;
    const loanEntity = await getEntityInstance(loanEntityName);

    // Using the specific SDK method for getting a single record by ID
    const response = await loanEntity.getAllRecords();

    const record = response.items.find((item) => item.Id === loanId);

    console.log("Get loan by ID response:", record);

    if (!record) {
      return res.status(404).json({ message: "No loan found" });
    }

    return res.status(200).json({ data: record });
  } catch (error) {
    console.error("Get loan by ID error:", error);
    // If loanId is not a valid GUID, the SDK might throw an error
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

module.exports = {
  submitLoanApplication,
  getLoanApplication,
  getLoanApplicationById
};