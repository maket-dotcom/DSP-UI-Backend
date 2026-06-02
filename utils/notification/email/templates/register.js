const register = (userName) => {
    const body = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AdsShare</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    
        <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
            
            <h2 style="text-align: center; color: #333;">Welcome to AdsShare!</h2>
    
            <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
                Hi <strong>${userName}</strong>,
            </p>
    
            <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
                Thank you for joining AdsShare – the ultimate platform for brands and affiliate/publisher to collaborate and create impactful campaigns. We’re excited to have you on board!
            </p>
    
            <div style="text-align: center; background-color: #f0f0f0; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                <h3 style="font-size: 20px; color: #333; margin-top: 0;">What’s next?</h3>
                <p style="font-size: 16px; color: #666; margin-top: 10px; margin-bottom: 0;">
                    Explore your dashboard to start creating or discovering campaigns.
                </p>
            </div>
    
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="https://adsshare.in" style="text-decoration: none; background-color: #007bff; color: #fff; padding: 10px 20px; border-radius: 6px; font-size: 16px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
            </div>
    
            <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
                If you have any questions, feel free to reach out to us at <a href="mailto:support@adsshare.in" style="color: #007bff; text-decoration: none;">team@adsshare.in</a>.
            </p>
    
            <p style="font-size: 16px; color: #666; margin-bottom: 0;">
                Cheers,<br>
                The AdsShare Team
            </p>
        
        </div>
    
    </body>
    </html>
    `;
    const subject = 'Welcome to AdsShare!';
    return { body, subject };
};

module.exports = register;