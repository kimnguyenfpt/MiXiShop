var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');



const url = "mongodb://localhost:27017";
const dbName = 'bookshop';
const client = new MongoClient(url);
const saltRounds = 10;

async function connectDb() {
  await client.connect();
  console.log('Connected successfully to server');
  const db = client.db(dbName);
  return db;
}

router.get('/', async(req, res, next)=>{
  const db=await connectDb();
  const usersCollection = db.collection('users');
  const users = await usersCollection.find().toArray();
  res.render('users',{users})
})

// Lấy thông tin người dùng để sửa, dựa trên username
router.get('/edit/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const db = await connectDb();
    const usersCollection = db.collection('users');

    // Tìm người dùng dựa trên username
    const user = await usersCollection.findOne({ username: username });

    if (!user) {
      return res.status(404).send('Không tìm thấy người dùng với username cung cấp');
    }

    // Render trang sửa thông tin người dùng với dữ liệu đã lấy được
    res.render('editUser', { user }); 
  } catch (error) {
    console.error('Đã có lỗi xảy ra', error);
    res.status(500).send('Lỗi server khi lấy thông tin người dùng.');
  }
});


// xóa người dùng
router.get('/delete/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const db = await connectDb();
    const usersCollection = db.collection('users');

    const deleteResult = await usersCollection.deleteOne({ username: username });

    if(deleteResult.deletedCount === 0) {
      return res.status(404).send('Không tìm thấy người dùng để xóa.');
    }

    // Redirect sau khi xóa thành công
    res.redirect('/users');
  } catch (error) {
    console.error('Đã có lỗi xảy ra', error);
    res.status(500).send('Lỗi server khi xóa người dùng.');
  }
});


// Đăng ký
router.get('/register', function(req, res) {
  res.render('register'); 
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const db = await connectDb();
    const usersCollection = db.collection('users');

    // Kiểm tra xem người dùng đã tồn tại chưa
    const existingUser = await usersCollection.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).send('Người dùng đã tồn tại');
    }

    // Mã hóa mật khẩu và lưu người dùng mới
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await usersCollection.insertOne({ username, password: hashedPassword, email, role: 'user' });
  } catch (error) {
    res.status(500).send('Lỗi khi đăng ký');
  }
});


// Đăng nhập
router.get('/login', function(req, res) {
  res.render('login'); 
});

// Đăng nhập
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const db = await connectDb();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
      // Kiểm tra nếu người dùng là 'admin', chuyển hướng đến trang quản lý admin
      if (user.role === 'admin') {
        return res.redirect('/products'); 
      } else if (user.role === 'user') {
        // Chuyển hướng người dùng thông thường đến trang shopee
        return res.redirect('https://shopee.vn/');
      }
    } else {
      res.status(401).send('Tên đăng nhập hoặc mật khẩu không đúng');
    }
  } catch (error) {
    console.error('Đã có lỗi xảy ra', error);
    res.status(500).send('Lỗi server');
  }
});
// thay đổi mật khẩu

router.get('/change-password', function(req, res) {
  res.render('change-password'); 
});

router.post('/change-password', async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  try {
    const db = await connectDb();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username });

    // Kiểm tra mật khẩu hiện tại có đúng không
    if (user && await bcrypt.compare(currentPassword, user.password)) {
      // Mật khẩu hiện tại đúng, tiến hành cập nhật mật khẩu mới
      const salt = await bcrypt.genSalt(10);
      const hashedNewPassword = await bcrypt.hash(newPassword, salt);

      await usersCollection.updateOne({ username }, { $set: { password: hashedNewPassword } });

      res.redirect('/users/login');
    } else {
      // Mật khẩu hiện tại không đúng
      res.status(400).send('Mật khẩu hiện tại không chính xác.');
    }
  } catch (error) {
    console.error('Đã có lỗi xảy ra', error);
    res.status(500).send('Lỗi server khi thay đổi mật khẩu.');
  }
});



module.exports = router;
