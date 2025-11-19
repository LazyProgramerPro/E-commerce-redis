import { itemsByViewsKey, itemsKey } from '$services/keys'
import { client } from '$services/redis'
import { deserialize } from './deserialize'

/**
 * Lấy danh sách các mục (items) được sắp xếp theo số lượt xem (views) từ Redis.
 *
 * Hàm này thực hiện truy vấn Redis để lấy các mục từ một sorted set, sắp xếp theo thứ tự giảm dần hoặc tăng dần,
 * với khả năng phân trang thông qua offset và count. Nó sử dụng lệnh SORT của Redis để lấy dữ liệu từ các hash keys
 * liên quan đến items, bao gồm ID, tên, lượt xem, thời gian kết thúc, URL hình ảnh và giá.
 *
 * Sau khi lấy dữ liệu thô từ Redis, hàm sẽ phân tích và deserialize từng mục thành một đối tượng item,
 * sau đó trả về mảng các items đã được xử lý.
 *
 * @param order - Thứ tự sắp xếp: 'DESC' (giảm dần, mặc định) hoặc 'ASC' (tăng dần). Xác định xem các mục có được sắp xếp
 *                theo lượt xem từ cao xuống thấp hay ngược lại.
 * @param offset - Vị trí bắt đầu lấy dữ liệu (mặc định là 0). Dùng để phân trang, bỏ qua số lượng mục đầu tiên.
 * @param count - Số lượng mục tối đa cần lấy (mặc định là 10). Giới hạn số mục trả về trong một lần truy vấn.
 * @returns Một mảng các đối tượng item đã được deserialize, mỗi item chứa thông tin như ID, tên, lượt xem, v.v.
 *          Nếu không có mục nào, trả về mảng rỗng.
 *
 * @example
 * ```typescript
 * const items = await itemsByViews('DESC', 0, 5);
 * console.log(items); // Lấy 5 mục đầu tiên sắp xếp theo lượt xem giảm dần
 * ```
 *
 * @note Hàm này sử dụng Redis client để thực hiện truy vấn. Đảm bảo rằng các keys như itemsByViewsKey() và itemsKey()
 *       đã được định nghĩa đúng trong codebase. Hàm deserialize() được sử dụng để chuyển đổi dữ liệu từ chuỗi thành đối tượng.
 *       Trong quá trình xử lý, dữ liệu được log ra console để debug.
 */
export const itemsByViews = async (order: 'DESC' | 'ASC' = 'DESC', offset = 0, count = 10) => {
  let results = await client.sort(itemsByViewsKey(), {
    GET: [
      '#',
      `${itemsKey('*')}->name`,
      `${itemsKey('*')}->views`,
      `${itemsKey('*')}->endingAt`,
      `${itemsKey('*')}->imageUrl`,
      `${itemsKey('*')}->price`,
    ],
    BY: 'nosort',
    DIRECTION: order,
    LIMIT: {
      offset,
      count,
    },
  })

  // Parsing Output

  const items = []

  while ((results as string[]).length) {
    const [id, name, views, endingAt, imageUrl, price, ...rest] = results as string[]
    const item = deserialize(id, { name, views, endingAt, imageUrl, price })
    items.push(item)
    results = rest
  }

  console.log('items', JSON.stringify(items, null, 2))

  return items
}
