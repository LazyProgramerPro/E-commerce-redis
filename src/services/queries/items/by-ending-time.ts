import { itemsByEndingAtKey, itemsKey } from '$services/keys'
import { client } from '$services/redis'
import { deserialize } from './deserialize'

/**
 * Lấy danh sách các mục theo thời gian kết thúc.
 *
 * Hàm này truy vấn Redis để lấy các ID của các mục có thời gian kết thúc từ hiện tại trở đi,
 * sắp xếp theo thứ tự chỉ định (mặc định là giảm dần), và giới hạn kết quả dựa trên offset và count.
 * Sau đó, nó lấy thông tin chi tiết của từng mục từ Redis và deserialize chúng thành đối tượng.
 *
 * @param order - Thứ tự sắp xếp: 'DESC' (giảm dần) hoặc 'ASC' (tăng dần). Mặc định là 'DESC'.
 * @param offset - Số lượng mục bỏ qua từ đầu danh sách. Mặc định là 0.
 * @param count - Số lượng mục tối đa trả về. Mặc định là 10.
 * @returns Một mảng các đối tượng mục đã được deserialize.
 *
 * @example
 * ```typescript
 * const items = await itemsByEndingTime('ASC', 0, 5);
 * console.log(items); // Danh sách 5 mục sắp xếp tăng dần từ thời gian kết thúc gần nhất
 * ```
 *
 * @remarks
 * - Hàm sử dụng Redis sorted set với key được tạo bởi `itemsByEndingAtKey()` để lưu trữ thời gian kết thúc.
 * - Các mục được lấy từ hash với key được tạo bởi `itemsKey(id)`.
 * - Hàm `deserialize` được sử dụng để chuyển đổi dữ liệu từ Redis thành đối tượng TypeScript.
 * - Nếu không có mục nào, trả về mảng rỗng.
 */
export const itemsByEndingTime = async (order: 'DESC' | 'ASC' = 'DESC', offset = 0, count = 10) => {
  const ids = await client.zRange(itemsByEndingAtKey(), Date.now(), '+inf', {
    BY: 'SCORE',
    LIMIT: {
      offset,
      count,
    },
  })

  console.log('ids', ids)
  const results = await Promise.all(ids.map((id) => client.hGetAll(itemsKey(id))))

  return results.map((item, i) => deserialize(item[i], item))
}
