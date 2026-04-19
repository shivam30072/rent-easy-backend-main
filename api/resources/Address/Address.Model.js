import { addressModel } from './Address.Schema.js'
import { convertToObjectId } from '../../helper/index.js'

const getAddressByUserId = async (userId) => {
  return await addressModel.findOne({ userId: convertToObjectId(userId) })
}

const getAddressById = async (id) => {
  return await addressModel.findById(convertToObjectId(id))
}

const createAddress = async (addressData) => {
  return await addressModel.create(addressData)
}

const updateAddressByAddressId = async (addressId, addressData) => {
  const { _id, ...updateData } = addressData;
  const updatedAddress = await addressModel.findByIdAndUpdate(
    addressId,
    { $set: updateData },
    { new: true }
  )

  return updatedAddress

}

const deleteAddress = async (id) => {
  return await addressModel.findByIdAndDelete({_id: convertToObjectId(id)})
}

const AddressModel = {
  createAddress,
  getAddressByUserId,
  getAddressById,
  deleteAddress,
  updateAddressByAddressId
}

export default AddressModel
