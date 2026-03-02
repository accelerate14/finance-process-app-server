require("dotenv").config();
const { getEntityInstance } = require('../../../utils/uipath');

const profileEntityName = process.env.UIPATH_BPROFILE_ENTITY_NAME;
const employmentEntityName = process.env.UIPATH_BEMPLOYMENT_ENTITY_NAME;
const loanEntityName = process.env.UIPATH_BLOAN_ENTITY_NAME;

const getBorrowerProgress = async (req, res) => {
  try {
    const { borrowerId } = req.params;
    console.log(`Checking progress for borrowerId: ${borrowerId}`);

    // 1. Get operational instances for all three entities
    const [profileEntity, employmentEntity, loanEntity] = await Promise.all([
      getEntityInstance(profileEntityName),
      getEntityInstance(employmentEntityName),
      getEntityInstance(loanEntityName)
    ]);

    // 2. Fetch all records from all three entities concurrently
    const [profileData, employmentData, loanData] = await Promise.all([
      profileEntity.getAllRecords(),
      employmentEntity.getAllRecords(),
      loanEntity.getAllRecords()
    ]);

    // 3. Extract matching items (SDK returns data in .items array)
    const profileRecord = profileData.items.find(p => p.UserId === borrowerId);
    const employmentRecord = employmentData.items.find(e => e.UserId === borrowerId);
    const loanRecord = loanData.items.find(l => l.UserId === borrowerId);

    const hasProfile = !!profileRecord;
    const hasEmployment = !!employmentRecord;
    const hasLoan = !!loanRecord;

    // 4. Calculate progress logic
    let nextStep = 1;
    if (hasProfile) nextStep = 2;
    if (hasProfile && hasEmployment) nextStep = 3;
    if (hasProfile && hasEmployment && hasLoan) nextStep = 4;

    console.log(`Borrower ${borrowerId} progress: Step ${nextStep}`);

    return res.status(200).json({
      nextStep,
      completed: {
        profile: hasProfile,
        employment: hasEmployment,
        loan: hasLoan,
      },
      data: {
        profile: profileRecord || null,
        employment: employmentRecord || null,
        loan: loanRecord || null
      }
    });

  } catch (error) {
    console.error("Progress check error:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

module.exports = { getBorrowerProgress };