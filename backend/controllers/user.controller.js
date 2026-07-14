import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import crypto from 'node:crypto';
import nodemailer from "nodemailer";
import { createResetToken, verifyResetToken } from "../services/token.service.js";
import { sendResetPasswordEmail } from "../services/email.service.js";
import path from "path";
import fs from "fs";



export const register = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, password, role } = req.body;

        if (!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        };
        const file = req.file;
        const fileUri = getDataUri(file);
        const cloudResponse = await cloudinary.uploader.upload(fileUri.content);

        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                message: 'User already exist with this email.',
                success: false,
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            fullname,
            email,
            phoneNumber,
            password: hashedPassword,
            role,
            profile: {
                profilePhoto: cloudResponse.secure_url,
            }
        });

        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
    }
}
export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        };
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            })
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            })
        };
        // check role is correct or not
        if (role !== user.role) {
            return res.status(400).json({
                message: "Account doesn't exist with current role.",
                success: false
            })
        };

        const tokenData = {
            userId: user._id
        }
        const token = await jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '1d' });

        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        }

        return res.status(200).cookie("token", token, { maxAge: 1 * 24 * 60 * 60 * 1000, httpsOnly: true, sameSite: 'strict' }).json({
            message: `Welcome back ${user.fullname}`,
            user,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}
export const logout = async (req, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}


export const updateProfile = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, bio, skills } = req.body;
        const file = req.file;

        let resumeUrl = null;
        let resumeOriginalName = null;

        if (file) {
            try {
                const userId = req.id;

                // Create uploads directory if it doesn't exist
                const uploadsDir = path.join(process.cwd(), 'uploads', 'resumes');
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                    console.log("Created uploads directory:", uploadsDir);
                }

                // Generate unique filename
                const timestamp = Date.now();
                const filename = `${userId}_${timestamp}_${file.originalname}`;
                const filepath = path.join(uploadsDir, filename);

                // Save file to disk
                fs.writeFileSync(filepath, file.buffer);

                // Store relative path for database
                resumeUrl = `/uploads/resumes/${filename}`;
                resumeOriginalName = file.originalname;

                console.log("✅ Resume saved locally:", {
                    filename: filename,
                    path: resumeUrl,
                    size: file.size,
                    mimetype: file.mimetype
                });

            } catch (uploadError) {
                console.error("❌ Resume upload failed:", uploadError.message);
                return res.status(400).json({
                    message: "Failed to upload resume. Please try again.",
                    error: uploadError.message,
                    success: false
                });
            }
        }

        let skillsArray = [];
        if (skills) {
            skillsArray = skills
                .split(",")
                .map(skill => skill.trim())
                .filter(skill => skill.length > 0);
        }

        const userId = req.id;

        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found.",
                success: false
            });
        }

        if (fullname) user.fullname = fullname;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (bio) user.profile.bio = bio;
        if (skillsArray.length > 0) user.profile.skills = skillsArray;

        if (resumeUrl) {
            user.profile.resume = resumeUrl; // Relative path
            user.profile.resumeOriginalName = resumeOriginalName;
        }

        await user.save();

        const userResponse = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: {
                bio: user.profile.bio,
                skills: user.profile.skills,
                resume: user.profile.resume,
                resumeOriginalName: user.profile.resumeOriginalName,
                profilePhoto: user.profile.profilePhoto
            }
        };

        return res.status(200).json({
            message: "Profile updated successfully.",
            user: userResponse,
            success: true
        });

    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({
            message: "An error occurred while updating profile.",
            error: error.message,
            success: false
        });
    }
};
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({  // ✅ 400, not 404 (bad request, not found)
                message: "Email is required",
                success: false
            });
        }

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(200).json({
                message: 'If an account exists, a reset link has been sent.',
                success: true
            });
        }


        const { resetToken, hashedToken, expiresAt } = createResetToken()








        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = expiresAt;

        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;


        await sendResetPasswordEmail(user.email, resetUrl)

        res.status(200).json({
            message: 'If an account exists, a reset link has been sent.',
            success: true
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            message: 'Server error',
            success: false
        });
    }
};



export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params
        const { password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                message: 'Token and password are required',
                success: false
            });

        }


        const user = await User.findOne({
            resetPasswordToken: { $exists: true },
            resetPasswordExpires: { $gt: Date.now() }
        })

        if (!user || !verifyResetToken(token, user.resetPasswordToken)) {
            return res.status(404).json({
                message: "Invalid or expired token",
                success: false
            })
        }
        const hashPassword = await bcrypt.hash(password, 10)

        user.password = hashPassword
        user.resetPasswordToken = undefined
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({
            message: 'Password reset successful! You can now log in.',
            success: true
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            message: 'Server error',
            success: false
        });
    }
};