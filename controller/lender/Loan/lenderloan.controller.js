const { entitiesService, getEntityInstance } = require("../../../utils/uipath");
require("dotenv").config();

const loanEntityName = process.env.UIPATH_BLOAN_ENTITY_NAME;

/**
 * POST /borrower/loan
 * Logic: Upsert - Update if a loan exists for this UserId, otherwise Insert.
 */
const submitLoanApplication = async (req, res) => {
    try {
        const loanData = req.body;
        if (!loanData.UserId) {
            return res.status(400).json({ message: "Borrower ID required" });
        }

        const loanEntity = await getEntityInstance(loanEntityName);
        const entityUuid = loanEntity.id;

        // Check for existing loan for this user
        const response = await entitiesService.getAllRecords(entityUuid);
        const existingLoan = response.items.find(l => l.UserId === loanData.UserId);

        const payload = {
            ...loanData,
            status: "SUBMITTED",
        };

        let result;
        if (existingLoan) {
            // UPDATE: Must be an array and include the system 'Id'
            result = await entitiesService.updateRecordsById(entityUuid, [{
                ...payload,
                Id: existingLoan.Id
            }]);
        } else {
            // INSERT
            result = await entitiesService.insertRecordById(entityUuid, payload);
        }

        return res.status(201).json({
            message: existingLoan ? "Loan application updated" : "Loan application submitted",
            data: result,
        });
    } catch (error) {
        console.error("Loan submit error:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * GET /borrower/loan
 */
const getLoanApplications = async (req, res) => {
    try {
        const loanEntity = await getEntityInstance(loanEntityName);
        const loans = await entitiesService.getAllRecords(loanEntity.id);

        if (!loans || loans.items.length === 0) {
            return res.status(404).json({ message: "No loans found" });
        }

        return res.status(200).json({ data: loans.items });
    } catch (error) {
        console.error("Get loan error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * GET /borrower/loan/:loanId
 */
const getLoanApplicationById = async (req, res) => {
    try {
        const { loanId } = req.params;
        const loanEntity = await getEntityInstance(loanEntityName);
        
        // Use getRecordById(entityUuid, recordUuid)
        const record = await entitiesService.getRecordById(loanEntity.id, loanId);

        if (!record) {
            return res.status(404).json({ message: "No loan found" });
        }

        return res.status(200).json({ data: record });
    } catch (error) {
        console.error("Get loan error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * PATCH/POST /loan/status/:loanId
 */
const updateLoanStatus = async (req, res) => {
    try {
        const { loanId } = req.params;
        const { status } = req.body;

        if (!loanId) return res.status(400).json({ message: "Loan ID required" });

        const loanEntity = await getEntityInstance(loanEntityName);
        
        // UPDATE: documentation requires updateRecordsById(entityId, dataArray)
        const result = await entitiesService.updateRecordsById(loanEntity.id, [{
            Id: loanId,
            CaseStatus: status // Use the exact field name in your Data Service (e.g., status or CaseStatus)
        }]);
        
        return res.status(200).json({ message: "Loan status updated", data: result });

    } catch (error) {
        console.error("Update loan status error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = {
    submitLoanApplication,
    getLoanApplications,
    getLoanApplicationById,
    updateLoanStatus
};