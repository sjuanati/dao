const DAO = artifacts.require("DAO");

module.exports = (deployer) => {
  deployer.deploy(DAO, 2, 2, 50);
};
