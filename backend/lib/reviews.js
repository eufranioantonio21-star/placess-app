const MAX_REVIEW_COMMENT_LENGTH = 1000;

function parseReviewInput(body = {}) {
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'A classificação deve ser um número inteiro entre 1 e 5' };
  }

  if (body.comment !== undefined && body.comment !== null && typeof body.comment !== 'string') {
    return { error: 'O comentário deve ser texto' };
  }

  const comment = typeof body.comment === 'string' ? body.comment.trim() : null;
  if (comment && comment.length > MAX_REVIEW_COMMENT_LENGTH) {
    return { error: `O comentário não pode exceder ${MAX_REVIEW_COMMENT_LENGTH} caracteres` };
  }

  return { value: { rating, comment: comment || null } };
}

module.exports = { MAX_REVIEW_COMMENT_LENGTH, parseReviewInput };
