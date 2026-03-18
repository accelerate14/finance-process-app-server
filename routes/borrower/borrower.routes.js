const express = require("express");
const router = express.Router();
const upload = require("../../middleware/multer.middlerware");

// Import Schemas
const { loginSchema, registerSchema } = require("../../validations/auth.validation");
const { borrowerProfileSchema, getProfileSchema } = require("../../validations/borrower.validation");
const { employmentInfoSchema, getEmploymentParamsSchema } = require("../../validations/employment.validation");
const { 
  loanSubmissionSchema, 
  getLoanParamsSchema, 
  getLoanByIdSchema 
} = require("../../validations/loan.validation");

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
const validate = require("../../middleware/validate.middleware");

/* =================================================
   AUTH ROUTES
================================================= */
router.post("/login", validate(loginSchema), login);
router.post("/register", validate(registerSchema), register);

/* =================================================
   PROFILE (STEP 1)
================================================= */
router.post("/profile/submit", validate(borrowerProfileSchema), submitBorrowerProfile);
router.get("/profile/:borrowerId", validate(getProfileSchema, "params"), getBorrowerProfile);

/* =================================================
   EMPLOYMENT (STEP 2)
================================================= */
router.post("/employment/submit", validate(employmentInfoSchema), submitEmploymentInfo);
router.get("/employment/:borrowerId", validate(getEmploymentParamsSchema, "params"), getEmploymentInfo);

/* =================================================
   LOAN APPLICATION (STEP 3)
================================================= */
router.post("/loan/submit", validate(loanSubmissionSchema), submitLoanApplication);
router.get("/loans/:borrowerId", validate(getLoanParamsSchema, "params"), getLoanApplication);
// Note: using getLoanByIdSchema here to ensure loanId is a valid GUID
router.get("/loan/:loanId", validate(getLoanByIdSchema, "params"), getLoanApplicationById);

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
    { name: "DriversLicense", maxCount: 1 },
    { name: "PayStub", maxCount: 1 },
  ]),
  uploadBorrowerDocuments
);
router.get("/documents/:caseId", getBorrowerDocuments);

/* =================================================
   STAGE MANAGEMENT (STEP 5)
================================================= */
router.post("/stages/create-stage", createBorrowerStages);
router.get("/stages/:borrowerId", getBorrowerStages);
router.put("/stages/update-stage/:borrowerId", updateBorrowerStages);

// NEW: The actual file stream (The "Bridge" to UiPath)
router.get("/documents/file/:recordId/:fieldName", streamDocumentFile);

module.exports = router;