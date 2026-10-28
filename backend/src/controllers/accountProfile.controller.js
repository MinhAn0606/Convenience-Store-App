const bcrypt = require('bcryptjs');
const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const fields = 'fullName email phone avatarUrl role membership createdAt';
const get = async (id, password = false) => {
  const user = await User.findOne({ _id: id, status: 'active' }).select(`${fields}${password ? ' +passwordHash' : ''}`);
  if (!user) throw new ApiError(401, 'Tài khoản không còn hoạt động');
  return user;
};
const safe = (u) => ({ id: u._id, _id: u._id, fullName: u.fullName, email: u.email, phone: u.phone || '', avatarUrl: u.avatarUrl || '', role: u.role, membership: u.membership, createdAt: u.createdAt });
exports.getProfile = asyncHandler(async (req, res) => res.json(safe(await get(req.user.id))));
exports.updateProfile = asyncHandler(async (req, res) => {
  const u = await get(req.user.id);
  if (req.body.fullName !== undefined) {
    if (typeof req.body.fullName !== 'string' || !req.body.fullName.trim() || req.body.fullName.trim().length > 120) throw new ApiError(400, 'Họ tên cần từ 1 đến 120 ký tự');
    u.fullName = req.body.fullName.trim();
  }
  if (req.body.phone !== undefined) {
    if (typeof req.body.phone !== 'string' || (req.body.phone && !/^\+?[0-9 ()-]{7,20}$/.test(req.body.phone))) throw new ApiError(400, 'Số điện thoại không hợp lệ');
    u.phone = req.body.phone.trim();
  }
  await u.save();
  res.json(safe(u));
});
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword) > 72) throw new ApiError(400, 'Mật khẩu mới cần ít nhất 8 ký tự và tối đa 72 byte');
  const u = await get(req.user.id, true);
  if (!(await bcrypt.compare(currentPassword, u.passwordHash))) throw new ApiError(400, 'Mật khẩu hiện tại không đúng');
  u.passwordHash = await bcrypt.hash(newPassword, 10);
  await u.save();
  res.json({ message: 'Đã đổi mật khẩu' });
});
