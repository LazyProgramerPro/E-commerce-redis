import { usernamesKey, usernamesUniqueKey, usersKey } from '$services/keys'
import { client } from '$services/redis'
import type { CreateUserAttrs } from '$services/types'
import { genId } from '$services/utils'

export const getUserByUsername = async (username: string) => {
  // Use the username argument to look up the persons User ID
  // with the usernames sorted set
  const decimalId = await client.zScore(usernamesKey(), username)

  // make sure we actually got an ID from the lookup
  if (!decimalId) {
    throw new Error('User does not exist')
  }

  // Take the id and convert it back to hex
  const id = decimalId.toString(16)
  // Use the id to look up the user's hash
  const user = await client.hGetAll(usersKey(id))

  // deserialize and return the hash
  return deserialize(id, user)
}

export const getUserById = async (id: string) => {
  const user = await client.hGetAll(usersKey(id))

  return deserialize(id, user)
}

/**
 * Tạo một người dùng mới với các thuộc tính được cung cấp.
 * Hàm này sẽ kiểm tra xem tên người dùng có bị trùng không, sau đó lưu thông tin người dùng vào Redis.
 * @param attrs - Các thuộc tính để tạo người dùng, bao gồm username và password.
 * @returns ID của người dùng mới được tạo.
 */
export const createUser = async (attrs: CreateUserAttrs) => {
  // Tạo một ID duy nhất cho người dùng mới bằng cách sử dụng hàm genId()
  const id = genId()

  // Kiểm tra xem tên người dùng đã tồn tại trong tập hợp duy nhất usernamesUniqueKey() chưa
  const exists = await client.sIsMember(usernamesUniqueKey(), attrs.username)
  if (exists) {
    // Nếu tên người dùng đã tồn tại, ném lỗi để ngăn tạo người dùng trùng lặp
    throw new Error('Username is taken')
  }

  // Lưu thông tin người dùng vào hash Redis với key là usersKey(id), sử dụng hàm serialize để chuyển đổi dữ liệu
  await client.hSet(usersKey(id), serialize(attrs))
  // Thêm tên người dùng vào tập hợp duy nhất usernamesUniqueKey() để đảm bảo tính duy nhất
  await client.sAdd(usernamesUniqueKey(), attrs.username)
  // Thêm tên người dùng vào sorted set usernamesKey() với score là ID chuyển đổi sang số thập phân từ hex
  await client.zAdd(usernamesKey(), {
    value: attrs.username,
    score: parseInt(id, 16),
  })

  // Trả về ID của người dùng mới đã được tạo
  return id
}

const serialize = (user: CreateUserAttrs) => {
  return {
    username: user.username,
    password: user.password,
  }
}

const deserialize = (id: string, user: { [key: string]: string }) => {
  return {
    id,
    username: user.username,
    password: user.password,
  }
}
