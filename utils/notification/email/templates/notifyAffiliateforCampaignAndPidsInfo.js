const notifyAffiliateforCampaignAndPidsInfo = ({ camp, affInfos }) => {
    const body = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
        <p>Hey Team,</p>
        <p>I hope you are doing well.<br>
        Please check and take all campaign live as per the details below :</p>
  
        <table style="border-collapse: collapse; margin: 10px 0;">
          <tr><td><strong>Campaign Name:</strong></td><td>${camp.name}</td></tr>
          <tr><td><strong>Geos:</strong></td><td>${camp.geo?.join(', ')}</td></tr>
          <tr><td><strong>Preview URL:</strong></td><td><a href="${camp.previewURL}" target="_blank">${camp.previewURL}</a></td></tr>
          <tr><td><strong>Package Name:</strong></td><td>${camp.packageName}</td></tr>
          <tr><td><strong>Payable Event:</strong></td><td>${camp.payableEvent}</td></tr>
          <tr><td><strong>Fraud Tool:</strong></td><td>${camp.fraudTool}</td></tr>
          <tr><td><strong>Validation Criteria:</strong></td><td>${camp.validationCriteria}</td></tr>
          <tr><td><strong>MMP:</strong></td><td>${camp.platform}</td></tr>
          <tr><td><strong>af_prt:</strong></td><td>${camp.af_prt}</td></tr>
        </table>
  
        <p><strong>KPIs:</strong></p>
        <ul>
          ${camp.kpis?.map(kpi => `<li><strong>KPI Type:</strong> ${kpi.kpiType} &rarr; <strong>KPI:</strong> ${kpi.kpi}</li>`).join('')}
        </ul>
  
        <p><strong>PID & Links:</strong></p>
        ${affInfos?.map(info => `
          <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
            <p><strong>PID:</strong> ${info.pid}</p>
            <p><strong>Currency:</strong> ${info.currency}</p>
            <p><strong>Payout:</strong> ${info.payout}</p>
            ${info.checkCTA ? `<p><strong>CTA Link:</strong> <a href="${info.CTA}" target="_blank">${info.CTA}</a></p>` : ''}
            ${info.checkCTV ? `<p><strong>CTV Link:</strong> <a href="${info.CTV}" target="_blank">${info.CTV}</a></p>` : ''}
            ${info.checkVTA ? `<p><strong>VTA Link:</strong> <a href="${info.VTA}" target="_blank">${info.VTA}</a></p>` : ''}
            ${info.checkOneLink ? `<p><strong>One Link:</strong> <a href="${info.oneLink}" target="_blank">${info.oneLink}</a></p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  
    const subject = `Please Run this campaign: ${camp.name}`;
    return { body, subject };
  };
  

module.exports = notifyAffiliateforCampaignAndPidsInfo;
