const { loadCommitments, saveCommitments } = require("../lib/storage");

function getAllCommitments() {
  return loadCommitments();
}

function saveAllCommitments(commitments) {
  saveCommitments(commitments);
}

function findCommitmentById(id) {
  const commitments = loadCommitments();
  return commitments.find((commitment) => commitment.id === id) || null;
}

function createCommitment(commitment) {
  const commitments = loadCommitments();
  commitments.push(commitment);
  saveCommitments(commitments);
  return commitment;
}

function updateCommitmentById(id, updates) {
  const commitments = loadCommitments();
  const index = commitments.findIndex((commitment) => commitment.id === id);

  if (index === -1) {
    return null;
  }

  commitments[index] = {
    ...commitments[index],
    ...updates,
  };

  saveCommitments(commitments);
  return commitments[index];
}

module.exports = {
  getAllCommitments,
  saveAllCommitments,
  findCommitmentById,
  createCommitment,
  updateCommitmentById,
};