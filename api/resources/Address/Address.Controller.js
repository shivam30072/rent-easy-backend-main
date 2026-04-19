import AddressModel from './Address.Model.js'
import UserModel from '../User/User.Model.js'
import AppError from '../../helper/AppError.js'
import { ADDRESS_MESSAGES as MSG } from './Address.Constant.js'

const createAddress = async (req, res, next) => {
  try {
    const addressData = req.body.addressData || req.body
    const address = await AddressModel.createAddress(addressData)
    
    // Sync to User table if userId is present
    if (addressData.userId) {
      const { _id, userId, __v, createdAt, updatedAt, ...cleanAddress } = address.toObject ? address.toObject() : address;
      await UserModel.updateUser(addressData.userId, { 
        address: { ...cleanAddress, addressId: _id } 
      });
    }

    return res.success(201, MSG.ADDRESS_CREATED, address)
  } catch (err) {
    next(err)
  }
}

const updateAddressByAddressId = async (req, res, next) => {
  try {
    const addressId = req.body.addressId || req.body._id
    const addressData = req.body.addressData || req.body
    const address = await AddressModel.updateAddressByAddressId(addressId, addressData)

    // Sync to User table if userId is present
    if (addressData.userId || address.userId) {
      const uId = addressData.userId || address.userId;
      const { _id, userId, __v, createdAt, updatedAt, ...cleanAddress } = address.toObject ? address.toObject() : address;
      await UserModel.updateUser(uId, { 
        address: { ...cleanAddress, addressId: _id } 
      });
    }

    return res.success(200, MSG.ADDRESS_UPDATED, address)
  } catch (err) {
     next(err)
  }
}

const getAddressByUserId = async (req, res, next) => {
  try {
    const { userId } = req.body
    const addresses = await AddressModel.getAddressByUserId(userId)
    return res.success(200, MSG.ALL_ADDRESSES, addresses)
  } catch (err) {
     next(err)
  }
}

const getAddressById = async (req, res, next) => {
  try {
    const { addressId } = req.body
    const address = await AddressModel.getAddressById(addressId)
    if (!address){
      throw new AppError(MSG.NOT_FOUND, 404)
    }
    return res.success(200, MSG.ADDRESS_FOUND, address)
  } catch (err) {
    next(err)
  }
}

const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.body
    const address = await AddressModel.deleteAddress(addressId)
    if (!address)  throw new AppError(MSG.NOT_FOUND, 404)
      return res.success(200, MSG.ADDRESS_DELETED)
  } catch (err) {
     next(err)
  }
}

const AddressController = {
  createAddress,
  getAddressByUserId,
  getAddressById,
  deleteAddress,
  updateAddressByAddressId
}

export default AddressController