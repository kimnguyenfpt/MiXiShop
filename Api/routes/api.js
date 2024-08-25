require('dotenv').config();
var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());


const multer = require('multer'); 
//Thiết lập nơi lưu trữ và tên file 

let storage = multer.diskStorage({ 
destination: function (req, file, cb) { 
cb(null, './public/images') 
}, 
filename: function (req, file, cb) { 
cb(null, file.originalname) 
} 
}) 
//Kiểm tra file upload 
function checkFileUpLoad(req, file, cb){ 
if(!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)){ 
return cb(new Error('Bạn chỉ được upload file ảnh')); 
} 
cb(null, true); 
} 
//Upload file 
let upload = multer({ storage: storage, fileFilter: checkFileUpLoad }); 
// Import model
const connectDb = require('../models/db');

router.get('/products',async(req, res, next)=>{
    const db=await connectDb();
    const productsCollection = db.collection('products');
    const products = await productsCollection.find().toArray();
    if (products) {
        res.status(200).json(products);
    }else{
        res.status(404).json({message: 'Not found'});
    }
});


//Lấy danh sách sản phẩm nổi bật
router.get('/hot-products', async (req, res, next) => {
    const db = await connectDb();
    const productsCollection = db.collection('products');
    const products = await productsCollection.find({ hot: 1 }).limit(8).toArray();
    if (products) {
        res.status(200).json(products);
    } else {
        res.status(404).json({ message: 'Not found' });
    }
});

//Lấy danh sách sản phẩm new
router.get('/new-products', async (req, res, next) => {
    const db = await connectDb();
    const productsCollection = db.collection('products');
    const products = await productsCollection.find({ new: 2 }).limit(4).toArray();
    if (products) {
        res.status(200).json(products);
    } else {
        res.status(404).json({ message: 'Not found' });
    }
});



//Lấy danh sách sản phẩm theo Mã danh mục: 

router.get('/products/categoryid/:id', async (req, res, next) => {
    const categoryId = parseInt(req.params.id); // Chuyển đổi id từ chuỗi sang số
    const db = await connectDb();
    const productsCollection = db.collection('products');

    try {
        // Truy vấn tìm tất cả sản phẩm thuộc danh mục đó
        const products = await productsCollection.find({ categoryId: categoryId }).toArray();
        if (products.length > 0) {
            res.status(200).json(products);
        } else {
            res.status(404).json({ message: 'No products found for this category' });
        }
    } catch (error) {
        console.error('Error fetching products by category id:', error);
        res.status(500).send('Server error');
    }
});

//Lấy danh sách sản phẩm theo Tên danh mục

router.get('/products/categoryname/:categoryName', async (req, res, next) => {
    const db = await connectDb();
    const categoriesCollection = db.collection('categories');
    const productsCollection = db.collection('products');
    
    const categoryName = req.params.categoryName;
    
    
    const category = await categoriesCollection.findOne({ name: categoryName }).then(category => {
        if (!category) {
            res.status(404).json({ message: 'Không tìm thấy danh mục' });
            return null; 
        }
        return category;
    }).catch(err => {
        res.status(500).json({ message: 'Not Found' });
        return null; 
    });

    if (!category) return;

    const categoryId = category.id;
    
   
    await productsCollection.find({ categoryId: categoryId }).toArray().then(products => {
        if (products.length > 0) {
            res.status(200).json(products);
        } else {
            res.status(404).json({ message: 'No products found for this category' });
        }
    }).catch(err => {
        res.status(500).json({ message: 'Error accessing the database', error: err });
    });
});



//Tìm kiếm sản phẩm

router.get('/products/search/:name', async (req, res, next) => {
    const db = await connectDb();
    const productCollection = db.collection('products');
    const product_name = req.params.name;
    
    const data = await productCollection.find({name: {$regex:product_name, $options: 'i'}}).toArray();
    if(data){
        res.status(200).json(data);
    }else{
        res.status(404).json({Message: 'Not found'})
    }
});

//Lấy danh sách sản phẩm và sắp xếp theo tăng dần về giá và giới hạn số lượng

router.get('/products/sort/asc/limit/:limit', async (req, res) => {
    const db = await connectDb();
    const productsCollection = db.collection('products');
    const limit = parseInt(req.params.limit, 10); // Lấy giới hạn số lượng từ tham số đường dẫn

    // Kiểm tra nếu giới hạn không phải là số hoặc nhỏ hơn 1
    if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ message: 'Giới hạn phải là số dương' });
    }

    try {
        const products = await productsCollection.find({})
                                                 .sort({ price: 1 }) // Sắp xếp theo giá tăng dần
                                                 .limit(limit) // Sử dụng giới hạn từ tham số đường dẫn
                                                 .toArray();

        if (products.length > 0) {
            res.status(200).json(products);
        } else {
            res.status(404).json({ message: 'No products found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving products', error });
    }
});


//Lấy danh sách sản phẩm và sắp xếp theo giảm dần về giá và giới hạn số lượng

router.get('/products/sort/desc/limit/:limit', async (req, res) => {
    const db = await connectDb();
    const productsCollection = db.collection('products');
    const limit = parseInt(req.params.limit, 10); // Lấy giới hạn số lượng từ tham số đường dẫn

    // Kiểm tra nếu giới hạn không phải là số hoặc nhỏ hơn 1
    if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ message: 'Giới hạn phải là số dương' });
    }

    try {
        const products = await productsCollection.find({})
                                                 .sort({ price: -1 }) // Sắp xếp theo giá giảm dần
                                                 .limit(limit) // Sử dụng giới hạn từ tham số đường dẫn
                                                 .toArray();

        if (products.length > 0) {
            res.status(200).json(products);
        } else {
            res.status(404).json({ message: 'No products found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving products', error });
    }
});




//Thêm sản phẩm

router.post('/products', upload.single('img'), async (req, res, next) => {
    let { name,  price, description, categoryId } = req.body;
    let img = req.file ? `${req.file.originalname}` : null; 

    const db = await connectDb();
    const productsCollection = db.collection('products');
    
    let lastProduct = await productsCollection.find().sort({ id: -1 }).limit(1).toArray();
    let id = lastProduct[0] ? lastProduct[0].id + 1 : 1;

    let newProduct = { id, name, img , price, description, categoryId }; 

    await productsCollection.insertOne(newProduct);
    if (newProduct) {
        res.status(200).json(newProduct);
    } else {
        res.status(404).json({ message: 'Not found' });
    }
});


//sửa sản phẩm
router.put('/products/:id',upload.single('img'),async(req,res,next)=>{
    let id = req.params.id;
    const db= await connectDb();
    const productsCollection = db.collection('products');
    let {name, price, description, categoryId} =req.body;
    if (req.file) {
        var img = req.file.originalname;
    }else{
        let product = await productsCollection.findOne({id: parseInt(id)});
        var img = product.img;
        
    }
    let editProduct = {name, price, categoryId, img, description};
    product = await productsCollection.updateOne({ id: parseInt(id) },  { $set: editProduct });
    if (product) {
        res.status(200).json(editProduct);
    }else{
        res.status(404).json({message: 'Not found'});
    }
});

//show chi tiết 1 sản phẩm
router.get('/products/:id',async(req, res, next)=>{
    const db=await connectDb();
    const productsCollection = db.collection('products');
    let id=req.params.id;
    const product = await productsCollection.findOne({id: parseInt(id)});
    if (product) {
        res.status(200).json(product);
    }else{
        res.status(404).json({message: 'Not found'});
    }
});

//Lấy danh sách sản phẩm theo trang và giới hạn số lượng: 

router.get('/products/page/:page/limit/:limit', async (req, res, next) => {
    const db = await connectDb();
    const productsCollection = db.collection('products');

    const page = parseInt(req.params.page);
    const limit = parseInt(req.params.limit);
    const skip = (page - 1) * limit;

    try {
        const totalProducts = await productsCollection.countDocuments(); // Count total products
        const totalPages = Math.ceil(totalProducts / limit); // Calculate total pages

        const products = await productsCollection.find({})
            .skip(skip)
            .limit(limit)
            .toArray();

        // Return both products and total pages
        res.status(200).json({ products, totalPages });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// xóa sản phẩm

router.delete('/products/:id', async (req, res, next) => {
    let id=req.params.id;
    const db=await connectDb();
    const productsCollection = db.collection('products');
    let product = await productsCollection.deleteOne({id: parseInt(id)});
    if(product){
        res.status(200).json({message: 'Xóa thành công'});
    }else{
        res.status(404).json({message: 'Not found'});
    }
});


//Trả về danh sách danh mục

router.get('/categories',async(req, res, next)=>{
    const db=await connectDb();
    const categoriesCollection = db.collection('categories');
    const categories = await categoriesCollection.find().toArray();
    if (categories) {
        res.status(200).json(categories);
    }else{
        res.status(404).json({message: 'Not found'});
    }
});

//show chi tiết 1 danh mục
router.get('/categories/:id',async(req, res, next)=>{
    const db=await connectDb();
    const categoriesCollection = db.collection('categories');
    let id=req.params.id;
    const categories = await categoriesCollection.findOne({id: parseInt(id)});
    if (categories) {
        res.status(200).json(categories);
    }else{
        res.status(404).json({message: 'Not found'});
    }
});

//thêm danh mục

router.post('/categories', upload.single('img'), async (req, res, next) => {
    let { name } = req.body;
    let img = req.file ? `${req.file.originalname}` : null; // Lấy đường dẫn đầy đủ của tệp tin

    const db = await connectDb();
    const categoriesCollection = db.collection('categories');
    
    let lastCategory = await categoriesCollection.find().sort({ id: -1 }).limit(1).toArray();
    let id = lastCategory[0] ? lastCategory[0].id + 1 : 1;

    let newCategory = { id, name, img }; // Thêm thuộc tính 'img' vào đối tượng category

    await categoriesCollection.insertOne(newCategory);
    if (newCategory) {
        res.status(200).json(newCategory);
    } else {
        res.status(404).json({ message: 'Not found' });
    }
});

//sửa danh mục
router.put('/categories/:id',upload.single('img'),async(req,res,next)=>{
    let id = req.params.id;
    const db= await connectDb();
    const categoriesCollection = db.collection('categories');
    let {name} =req.body;
    if (req.file) {
        var img = req.file.originalname;
    }else{
        let category = await categoriesCollection.findOne({id: parseInt(id)});
        var img = category.img;
        
    }
    let editcategory = {name, img};
    category = await categoriesCollection.updateOne({ id: parseInt(id) },  { $set: editcategory });
    if (category) {
        res.status(200).json(editcategory);
    }else{
        res.status(404).json({message: 'Not found'});
    }
});

//xóa danh mục

router.delete('/categories/:id', async (req, res, next) => {
    let id=req.params.id;
    const db=await connectDb();
    const categoriesCollection = db.collection('categories');
    let categories = await categoriesCollection.deleteOne({id: parseInt(id)});
    if(categories){
        res.status(200).json({message: 'Xóa thành công'});
    }else{
        res.status(404).json({message: 'Not found'});
    }
});


router.get('/users', async (req, res) => {
    try {
        const db = await connectDb();
        const userCollection = db.collection('users');
        const users = await userCollection.find({}).toArray();
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi khi lấy danh sách người dùng" });
    }
});

//dang nhập
router.post('/users/register', async (req, res, next) => {
    try {
        let { email, password, username } = req.body;

        if (!email || !password || !username) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" });
        }

        const db = await connectDb();
        const userCollection = db.collection('users');
        let user = await userCollection.findOne({ email: email });
        if (user) {
            return res.status(409).json({ message: "Email đã tồn tại" });
        } else {
            const salt = bcrypt.genSaltSync(10);
            let hashPassword = bcrypt.hashSync(password, salt);

            if (!password || !hashPassword) {
                return res.status(500).json({ message: "Lỗi khi mã hóa mật khẩu" });
            }

            let newUser = { email, password: hashPassword, username, role: 'user' };
            let result = await userCollection.insertOne(newUser);

            // Tạo token cho người dùng mới
            const token = jwt.sign({ id: result.insertedId, email: newUser.email }, 'secretkey', { expiresIn: '600s' });

            console.log(result);
            return res.status(200).json({ message: "Đăng ký thành công", token: token });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Lỗi khi thêm người dùng mới" });
    }
});




//chức nang dang nhap su dung token

const jwt = require('jsonwebtoken')
router.post('/users/login', async (req, res, next) => {
    let { email, password } = req.body;
    const db = await connectDb();
    const userCollection = db.collection('users');

    let user = await userCollection.findOne({ email: email });

    if (user) {
        // Sử dụng await để chờ kết quả từ bcrypt.compare()
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (isPasswordValid) {
            const token = jwt.sign(
                { email: user.email, role: user.user },
                'secretkey',
                { expiresIn: '600s' }
            );
            res.status(200).json({ token: token });
        } else {
            res.status(403).json({ message: 'Email hoặc mật khẩu không đúng' });
        }
    } else {
        res.status(403).json({ message: 'Email này chưa đăng kí' });
    }
});
//Xác thực token 
function authenToken(req, res, next){ 
    //Truy cập vào header để lấy authorization
    const bearerHeader = req.headers['authorization']; 
    //kiểm tra authorization có dữ liệu không
    if(typeof bearerHeader !== 'undefined'){ 
        //nếu có thì cắt value ra và lấy phần tử thứ 2 là token có index là 1
      const bearerToken = bearerHeader.split(' ')[1]; 
      //gán cho nó vào biến token
      req.token = bearerToken; 
      //sử dụng thư viện JWT để xác thực với khóa bí mật secretkey coi khớp không
      jwt.verify(req.token, 'secretkey', (err, authData)=>{ 
        if(err){ 
            //nếu lỗi không có quyền truy cập
          res.status(403).json({message: "Không có quyền truy cập"}); 
        }else{ 
            //nếu không lỗi thì tiếp tục hàm nhúng vào hàm nhúng xác thực vào
          next(); 
        } 
      }) 
    }else{ 
      res.status(403).json({message: "Không có quyền truy cập"}); 
    } 
}

// API để thay đổi mật khẩu
router.post('/change-password', async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Cần cung cấp email, mật khẩu cũ và mật khẩu mới.' });
    }

    try {
        const db = await connectDb();
        const userCollection = db.collection('users');
        const user = await userCollection.findOne({ email: email });

        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }

        // Kiểm tra mật khẩu cũ có chính xác không
        const match = await bcrypt.compare(currentPassword, user.password);

        if (!match) {
            return res.status(403).json({ message: 'Mật khẩu cũ không chính xác.' });
        }

        // Mã hóa mật khẩu mới và cập nhật
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(newPassword, salt);

        await userCollection.updateOne(
            { email: email },
            { $set: { password: hash } }
        );

        res.status(200).json({ message: 'Mật khẩu đã được cập nhật thành công.' });

    } catch (error) {
        console.error('Failed to change password:', error);
        res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu.' });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
      console.log('Request received at /forgot-password');
      const { email } = req.body;
      console.log('Email:', email);
  
      const db = await connectDb();
      const usersCollection = db.collection('users');
      const user = await usersCollection.findOne({ email });
  
      if (!user) {
        console.log('User not found');
        return res.status(400).json({ message: 'User not found' });
      }
  
      const token = crypto.randomBytes(20).toString('hex');
      const expirationTime = new Date(Date.now() + 3600000); // 1 hour
  
      const updateResult = await usersCollection.updateOne({ email }, {
        $set: {
          resetPasswordToken: token,
          resetPasswordExpires: expirationTime
        }
      });
  
      console.log('Update result:', updateResult);
  
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
  
      const mailOptions = {
        to: user.email,
        from: process.env.EMAIL_USER,
        subject: 'Password Reset Request',
        text: `Bạn nhận được thông báo này vì bạn (hoặc người khác) đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.\n\n
        Vui lòng nhấp vào liên kết sau hoặc dán liên kết này vào trình duyệt của bạn để hoàn tất quá trình:\n\n
        http://localhost:4200/reset-pass?token=${token}\n\n
        Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.\n`
      };      
  
      transporter.sendMail(mailOptions, (err, response) => {
        if (err) {
          console.error('Error sending email: ', err);
          return res.status(500).json({ message: 'Error sending email' });
        } else {
          console.log('Response: ', response);
          return res.status(200).json({ message: 'Recovery email sent' });
        }
      });
    } catch (error) {
      console.error('Error in /forgot-password route: ', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });

router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;
        const token = req.params.token;

        const db = await connectDb();
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send('Password reset token is invalid or has expired');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await usersCollection.updateOne({ resetPasswordToken: token }, {
            $set: {
                password: hashedPassword,
                resetPasswordToken: undefined,
                resetPasswordExpires: undefined
            }
        });

        res.status(200).send('Password has been updated');
    } catch (error) {
        console.error('Error in /reset-password route: ', error);
        res.status(500).send('Internal Server Error');
    }
});



module.exports = router;
