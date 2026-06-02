const verifyEmail = (otp) => {
    const body = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    
        <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
            
            <h2 style="text-align: center; color: #333;">Email Verification</h2>
    
            <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
                Please use the following One-Time Password (OTP) to verify your email address:
            </p>
    
            <div style="text-align: center; background-color: #f0f0f0; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                <h3 style="font-size: 24px; color: #333; margin-top: 0;">Your OTP:</h3>
                <p style="font-size: 36px; color: #007bff; margin-top: 10px; margin-bottom: 0;">${otp}</p>
            </div>
    
            <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
                Please enter this OTP in the appropriate field to verify your email address. This OTP is valid for a single use and will expire shortly.
            </p>
    
            <p style="font-size: 16px; color: #666; margin-bottom: 0;">
                If you did not request this verification, please ignore this email.
            </p>
        
        </div>
    
    </body>
    </html>`;
    const subject = 'Email verification';
    return { body, subject };
};

module.exports = verifyEmail;