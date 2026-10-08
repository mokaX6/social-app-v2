const Comment = require('../models/Comment');

// Turns post documents into plain objects for the API.
// Adds commentsCount and savesCount, and hides who saved the post (private).
// Accepts one post or an array and returns the same shape.
module.exports = async function shapePosts(input) {
  const list = Array.isArray(input) ? input : [input];

  // One query counts the comments of every post in the list
  const counts = await Comment.aggregate([
    { $match: { post: { $in: list.map((post) => post._id) } } },
    { $group: { _id: '$post', count: { $sum: 1 } } },
  ]);
  const byPost = new Map(counts.map((c) => [String(c._id), c.count]));

  const shaped = list.map((post) => {
    const { saves, ...rest } = post.toObject();
    return {
      ...rest,
      savesCount: saves.length,
      commentsCount: byPost.get(String(post._id)) || 0,
    };
  });

  return Array.isArray(input) ? shaped : shaped[0];
};
