export const getDirectRoomId = (userA, userB) => {
  if (!userA || !userB) {
    throw new Error("Both user ids are required to build a direct room id");
  }
  return [userA, userB].sort().join("_");
};

export const getUserRoomId = (userId) => {
  if (!userId) {
    throw new Error("userId is required to build a user room id");
  }
  return `user:${userId}`;
};


