async function recordCampaignClick(prisma, { campaignId, userId }) {
  try {
    await prisma.$transaction(async (transaction) => {
      const campaign = await transaction.campaign.findFirst({
        where: { id: campaignId, isActive: true },
        select: { id: true },
      });
      if (!campaign) {
        const error = new Error('Campanha activa não encontrada');
        error.code = 'CAMPAIGN_NOT_FOUND';
        throw error;
      }

      await transaction.campaignClick.create({ data: { campaignId, userId } });
      await transaction.campaign.update({
        where: { id: campaignId },
        data: { clicks: { increment: 1 } },
      });
    });
    return { counted: true };
  } catch (error) {
    if (error.code === 'P2002') return { counted: false };
    throw error;
  }
}

module.exports = { recordCampaignClick };
