import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { isSha256 } from '../utils/validation';
import { verifyHash } from '../services/verification.service';

export const verify = asyncHandler(async (req, res) => {
  const hash = String(req.params.hash ?? '');
  if (!isSha256(hash)) throw new AppError(400, 'Hash must be 64 hexadecimal characters');
  const { httpStatus, body } = await verifyHash(hash);
  res.status(httpStatus).json(body);
});
