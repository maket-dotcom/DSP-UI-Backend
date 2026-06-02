const notifyOperations = ({campaignName, userInfo, campaignLink}) => {
    const body = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Campaign Added</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    
        <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
            
            <h2 style="text-align: center; color: #333;">New Campaign Added</h2>
    
            <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
                Hi Team,
            </p>
    
            <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
                A new campaign has been added by the Sales Team.
            </p>
    
            <div style="text-align: center; background-color: #f0f0f0; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                <h3 style="font-size: 20px; color: #333; margin-top: 0;">Campaign Details</h3>
                <p style="font-size: 16px; color: #666; margin-top: 10px; margin-bottom: 0;">
                    <strong>Campaign Name:</strong> ${campaignName} <br>
                    <strong>Added by:</strong> ${userInfo.name} (${userInfo.email})
                </p>
            </div>
    
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="${campaignLink}" style="text-decoration: none; background-color: #007bff; color: #fff; padding: 10px 20px; border-radius: 6px; font-size: 16px; display: inline-block; font-weight: bold;">View Campaign</a>
            </div>
    
            <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
                Please review and proceed with the necessary steps.
            </p>
    
            <p style="font-size: 16px; color: #666; margin-bottom: 0;">
                Regards,<br>
                The AdsShare Team
            </p>
        </div>
    
    </body>
    </html>`;
    
    const subject = `New Campaign Lead Added: ${campaignName}`;
    return { body, subject };
};

module.exports = notifyOperations;