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

        const availableFundsBefore = await dao.availableFunds();
        await dao.executeProposal(1, { from: accounts[0] });
        const availableFundsAfter = await dao.availableFunds();

        assert((availableFundsBefore.toNumber() - 400) === availableFundsAfter.toNumber());
    });

    it('Should NOT execute proposal if not enough votes', async () => {
        await dao.createProposal('DAI v4', 100, investor3, { from: investor1 });
        await dao.vote(2, { from: investor1 });
        await time.increase(5);

        expectRevert(
            dao.executeProposal(2, { from: accounts[0] }),
            'cannot execute a proposal with votes # below quorum'
        );
    });

    // it('Should NOT execute proposal twice', async () => {
    //     expectRevert(
    //         dao.executeProposal(1, { from: accounts[0] }),
    //         'cannot execute a proposal already executed'
    //     );
    // });

    it('Should NOT execute proposal before end date', async () => {
        await dao.createProposal('DAI v5', 100, investor3, { from: investor1 });
        await dao.vote(3, { from: investor2 });

        expectRevert(
            dao.executeProposal(3, { from: accounts[0] }),
            'cannot execute a proposal before end date'
        );
    });

    it('Should withdraw ether', async () => {
        const balanceBefore = await web3.eth.getBalance(investor3);
        await dao.withdrawEther(5, investor3);
        const balanceAfter = await web3.eth.getBalance(investor3);
        const balanceBeforeBN = await web3.utils.toBN(balanceBefore);
        const balanceAfterBN = await web3.utils.toBN(balanceAfter);

        assert(balanceAfterBN.sub(balanceBeforeBN).toNumber() === 5);

    });

    it('Should NOT withdraw ether if not admin', async () => {
        expectRevert(
            dao.withdrawEther(5, investor3, {from: investor3}),
            'only admin'
        );
    });

    it('Should NOT withdraw ether if trying to withdraw too much', async () => {
        expectRevert(
            dao.withdrawEther(5000, investor3, {from: accounts[0]}),
            'not enough availableFunds'
        );
    });
});