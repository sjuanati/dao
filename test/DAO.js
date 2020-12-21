const { expectRevert, time } = require('@openzeppelin/test-helpers');
const DAO = artifacts.require('DAO');

contract('DAO', (accounts) => {
    let dao;

    const [investor1, investor2, investor3] = [accounts[1], accounts[2], accounts[3]];
    before(async () => {
        dao = await DAO.new(2, 2, 50);
    });

    it('Should accept contribution', async () => {
        await Promise.all([
            dao.contribute({ from: investor1, value: 1000 }),
            dao.contribute({ from: investor2, value: 1500 })
        ]);

        const isInvestor1 = await dao.investors(investor1);
        const isInvestor2 = await dao.investors(investor2);
        const sharesInvestor1 = await dao.shares(investor1);
        const sharesInvestor2 = await dao.shares(investor2);
        const totalShares = await dao.totalShares();
        const availableFunds = await dao.availableFunds();

        assert(isInvestor1 && isInvestor2);
        assert(sharesInvestor1.toNumber() === 1000);
        assert(sharesInvestor2.toNumber() === 1500);
        assert(totalShares.toNumber() === 2500);
        assert(availableFunds.toNumber() === 2500);
    });

    it('Should NOT accept contribution after contributionTime', async () => {
        //const dao = await DAO.new(2, 2, 50);
        await time.increase(3);

        expectRevert(
            dao.contribute({ from: investor1, value: 1000 }),
            'cannot contribute after contributionEnd'
        );
    });

    it('Should create proposal', async () => {
        await dao.createProposal('DAI', 400, investor3, { from: investor1 });
        const proposal = await dao.proposals(0);
        const availableFunds = await dao.availableFunds();
        const nextProposalId = await dao.nextProposalId();

        assert(proposal.id.toNumber() === 0);
        assert(proposal.name === 'DAI');
        assert(proposal.amount.toNumber() === 400);
        assert(proposal.recipient === investor3);
        assert(proposal.votes.toNumber() === 0);
        assert(proposal.executed === false);
        assert(availableFunds.toNumber() === 2100);
        assert(nextProposalId.toNumber() === 1);

    });

    it('Should NOT create proposal if not from investor', async () => {
        expectRevert(
            dao.createProposal('DAI v2', 400, investor3, { from: investor3 }),
            'only investors'
        );
    });

    it('Should NOT create proposal if amount too big', async () => {
        expectRevert(
            dao.createProposal('DAI v2', 3000, investor3, { from: investor1 }),
            'amount too big'
        );
    });

    it('Should vote', async () => {
        await dao.vote(0, { from: investor2 });
        const proposal = await dao.proposals(0);

        assert(proposal.votes.toNumber() === 1500); // vs. total investor's contribution amount (and not the proposal amount)
    });

    it('Should NOT vote if not investor', async () => {
        expectRevert(
            dao.vote(0, { from: investor3 }),
            'only investors'
        );
    });

    it('Should NOT vote if already voted', async () => {
        expectRevert(
            dao.vote(0, { from: investor2 }),
            'investor can only vote once for a proposal'
        );
    });

    it('Should NOT vote if after proposal end date', async () => {
        await time.increase(10);
        expectRevert(
            dao.vote(0, { from: investor1 }),
            'can only vote until proposal end'
        );
    });

    it('Should execute proposal', async () => {
        await dao.createProposal('DAI v3', 400, investor3, { from: investor2 });
        await dao.vote(1, { from: investor2 });
        await time.increase(5);

        const proposal = await dao.proposals(1);
        const totalSh = await dao.totalShares();
        const totalShares = totalSh.toNumber();
        const quorum = await dao.quorum();
        const proposal_votes = proposal.votes.toNumber();
        
        console.log('name', proposal.name);
        console.log('voproposal_votes', proposal_votes);
        console.log('totalShares', totalShares);
        console.log('quorum', quorum.toNumber());

        const perc = ((proposal_votes / totalShares) * 100);
        console.log('percentage', perc)

        await dao.executeProposal(1, { from: accounts[0] });

    });

    // it('Should NOT execute proposal if not enough votes', async () => {
    // });

    // it('Should NOT execute proposal twice', async () => {
    // });

    // it('Should NOT execute proposal before end date', async () => {
    // });

    // it('Should withdraw ether', async () => {
    // });

    // it('Should NOT withdraw ether if not admin', async () => {
    // });

    // it('Should NOT withdraw ether if trying to withdraw too much', async () => {
    // });
});