const axios = require("axios");
require("dotenv").config();

const BaseUrl = process.env.UIPATH_TOKEN_URL;
const dft = process.env.UIPATH_TOKEN_SECRET;
const loanEntity = process.env.UIPATH_BLOAN_ENTITY_NAME;

/**
 * POST /borrower/loan
 */
const submitLoanApplication = async (req, res) => {
    try {
        const loanData = req.body;

        if (!loanData.UserId) {
            return res.status(400).json({ message: "Borrower ID required" });
        }

        const payload = {
            ...loanData,
            status: "SUBMITTED",
            createdAt: new Date().toISOString(),
        };

        const response = await axios.post(
            `${BaseUrl}/${loanEntity}/insert`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${dft}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return res.status(201).json({
            message: "Loan application submitted",
            data: response.data,
        });
    } catch (error) {
        console.error("Loan submit error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * GET /borrower/loan/:borrowerId
 */
const getLoanApplications = async (req, res) => {
    try {
        const response = await axios.get(
            `${BaseUrl}/${loanEntity}/read`,
            {
                headers: { Authorization: `Bearer ${dft}` },
            }
        );

        console.log("Loans fetch response data:", response.data);
        const loans = response.data;
        console.log("Found loan:", loans);

        if (!loans) {
            return res.status(404).json({ message: "No loans found" });
        }

        return res.status(200).json({ data: loans });
    } catch (error) {
        console.error("Get loan error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const getLoanApplicationById = async (req, res) => {
    try {
        const { loanId } = req.params;

        const response = await axios.get(
            `${BaseUrl}/${loanEntity}/read/${loanId}`,
            {
                headers: { Authorization: `Bearer ${dft}` },
            }
        );

        console.log("Loan fetch response data:", response.data);

        if (!response) {
            return res.status(404).json({ message: "No loan found" });
        }

        return res.status(200).json({ data: response.data });
    } catch (error) {
        console.error("Get loan error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const updateLoanStatus = async (req, res) => {
    try {
        const { loanId } = req.params;
        const status = req.body.status;

        if (!loanId) {
            return res.status(400).json({ message: "Loan ID required" });
        }

        const response = await axios.post(
            `${BaseUrl}/${loanEntity}/update/${loanId}`,
            { CaseStatus: status },
            {
                headers: { Authorization: `Bearer ${dft}` },
            }
        )
        
        console.log("Loan approve response data:", response.data);
        return res.status(200).json({ message: "Loan approved", data: response.data });

    } catch (error) {
        console.error("Approve loan error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = {
    submitLoanApplication,
    getLoanApplications,
    getLoanApplicationById,
    updateLoanStatus
};
