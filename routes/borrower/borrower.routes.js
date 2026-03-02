const express = require("express");
const router = express.Router();
const upload = require("../../middleware/multer.middlerware");

/* ================= AUTH ================= */
const {
  login,
  register,
} = require("../../controller/borrower/Auth/borrowerAuth.controller");

/* ================= PROFILE ================= */
const {
  submitBorrowerProfile,
  getBorrowerProfile,
} = require("../../controller/borrower/Profile/borrowerCrud.controller");

/* ================= EMPLOYMENT ================= */
const {
  submitEmploymentInfo,
  getEmploymentInfo,
} = require("../../controller/borrower/Employment/borrowerEmployment.controller");

/* ================= LOAN ================= */
const {
  submitLoanApplication,
  getLoanApplication,
  getLoanApplicationById,
} = require("../../controller/borrower/Loan/borrowerLoan.controller");

/* ================= PROGRESS ================= */
const {
  getBorrowerProgress,
} = require("../../controller/borrower/Progress/borrowerProgress.controller");
const { uploadBorrowerDocuments, getBorrowerDocuments, streamDocumentFile } = require("../../controller/borrower/Document/borrowerDocuments.controller");
const { createBorrowerStages, getBorrowerStages, updateBorrowerStages } = require("../../controller/borrower/Progress/borrowerStages.controller");

/* =================================================
   AUTH ROUTES
================================================= */
router.post("/login", login);
router.post("/register", register);

/* =================================================
   PROFILE (STEP 1)
================================================= */
router.post("/profile/submit", submitBorrowerProfile);
router.get("/profile/:borrowerId", getBorrowerProfile);

/* =================================================
   EMPLOYMENT (STEP 2)
================================================= */
router.post("/employment/submit", submitEmploymentInfo);
router.get("/employment/:borrowerId", getEmploymentInfo);

/* =================================================
   LOAN APPLICATION (STEP 3)
================================================= */
router.post("/loan/submit", submitLoanApplication);
router.get("/loans/:borrowerId", getLoanApplication);
router.get("/loan/:loanId", getLoanApplicationById);

/* =================================================
   WIZARD PROGRESS (RESUME FLOW)
================================================= */
router.get("/progress/:borrowerId", getBorrowerProgress);

/* =================================================
   DOCUMENT UPLOAD (STEP 4)
================================================= */
router.post(
  "/documents/upload",
  upload.fields([
    { name: "driverLicense", maxCount: 1 },
    { name: "payStub", maxCount: 1 },
    { name: "profilePic", maxCount: 1 }
  ]),
  uploadBorrowerDocuments
);
router.get("/documents/:borrowerId", getBorrowerDocuments);

/* =================================================
   STAGE MANAGEMENT (STEP 5)
================================================= */
router.post("/stages/create-stage", createBorrowerStages);
router.get("/stages/:borrowerId", getBorrowerStages);
router.put("/stages/update-stage/:borrowerId", updateBorrowerStages);

router.get("/documents/:borrowerId", getBorrowerDocuments);

// NEW: The actual file stream (The "Bridge" to UiPath)
router.get("/documents/file/:recordId/:fieldName", streamDocumentFile);

module.exports = router;