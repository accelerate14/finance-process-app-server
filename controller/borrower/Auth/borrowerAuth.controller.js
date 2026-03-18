const jwt = require('jsonwebtoken');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { getEntityInstance } = require('../../../utils/uipath');

const entityName = process.env.UIPATH_BAUTH_ENTITY_NAME;

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const borrowerEntity = await getEntityInstance(entityName);
        const recordsResponse = await borrowerEntity.getAllRecords();

        if (!recordsResponse || !recordsResponse.items) {
            return res.status(500).json({ message: 'Failed to retrieve records from UiPath' });
        }

        console.log('Records retrieved from UiPath:', recordsResponse);

        // Search in the items array returned by the SDK
        const user = recordsResponse.items.find(u => u.emailAddress === email && u.isActive === true);
        console.log('Login attempt for email:', email, 'Found user:', user);

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const payload = { guid: user.userId.toString(), email: user.emailAddress };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '6h' });
        console.log('Login successful for user:', payload);
        return res.status(200).json({ message: 'User logged in successfully', token: token });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: error.message || 'Internal Server error' });
    }
};

const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const borrowerEntity = await getEntityInstance(entityName);

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            emailAddress: email,
            password: hashedPassword,
            isActive: true
        };

        // Attempt to insert immediately
        const insertedRecord = await borrowerEntity.insertRecord(newUser);

        const payload = { guid: insertedRecord.userId.toString(), email: insertedRecord.emailAddress };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '6h' });

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token: token
        });

    } catch (error) {
        // Log the full error to your server console for debugging
        console.error('Registration error details:', error);

        // Handling the "Value uniqueness violation" error you shared earlier
        if (
            error.type === 'ValidationError' ||
            error.message?.includes('uniquely constrained') ||
            error.message?.includes('repeated value') ||
            error.statusCode === 400 // The SDK mapped status code
        ) {
            return res.status(400).json({
                success: false,
                message: 'This email is already registered. Please try another email.'
            });
        }

        // Generic fallback for other 500 errors
        return res.status(500).json({
            success: false,
            message: 'Registration failed due to a server error.'
        });
    }
};

module.exports = {
    login,
    register
};  