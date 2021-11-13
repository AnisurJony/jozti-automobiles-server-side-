const express = require('express')
const app = express();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
require('dotenv').config();
const admin = require("firebase-admin");


const port = process.env.PORT || 5000;

const serviceAccount = require('./jozti-automobiles-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wbldh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {

    if (req.headers.authorization?.startsWith('Bearer')) {

        const token = req.headers.authorization.split(' ')[1];

        try {

            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;

        }
        catch {

        }
    }
    next();
}

async function joztiAutomobiles() {

    try {

        await client.connect();
        const database = client.db("joztiAutomobiles");
        const productsCollection = database.collection("products");
        const ordersCollection = database.collection("orders");
        const usersCollection = database.collection("users");
        const reviewsCollection = database.collection("reviews");

        // ------------ get order by email filter as per specific user or get all --------------//

        app.get('/orders', async (req, res) => {


            const email = req.query.email;

            if (email) {
                const query = { email: email };

                const cursor = ordersCollection.find(query);
                const orders = await cursor.toArray();


                res.json(orders);
            }
            else {
                const cursor = ordersCollection.find({});

                const orders = await cursor.toArray();

                res.json(orders);
            }





        });

        // ---------------- post an order -----------------//

        app.post('/orders', verifyToken, async (req, res) => {

            const order = req.body;
            order.createdAt = new Date();
            const result = await ordersCollection.insertOne(order);


            res.json(result)
        });

        // --------------------delete an order-------------------------//

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: ObjectId(id) }

            const result = await ordersCollection.deleteOne(query);

            res.json(result);
        });

        // ---------------- post a product -----------------//


        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res, json(result);
        });

        //-------------- get all products -----------------//

        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.json(products);
        });



        // -------------- post customer reviews -----------------//

        app.post('/reviews', async (req, res) => {

            const review = req.body;
            review.createdAt = new Date();
            const result = await reviewsCollection.insertOne(review);

            res.json(result);

        });

        // -----------get all reviews to display on the Ui ----------------//

        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const reviews = await cursor.toArray();
            res.json(reviews)
        })


        // ---------------- post an user -----------------//

        app.post('/users', async (req, res) => {

            const user = req.body;

            const result = await usersCollection.insertOne(user);

            res.json(result);
        });


        // ---------------- post an user -----------------//

        app.put('/users', async (req, res) => {

            const user = req.body;
            const filter = { email: user.email }
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);

            res.json(result);

        });

        app.get('/users', async (req, res) => {

            const cursor = usersCollection.find({});
            const users = await cursor.toArray();

            res.json(users);
        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;

            const query = { email: email }

            const user = await usersCollection.findOne(query);

            let isAdmin = false;

            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        });
        // ---------------- Make an existing user as admin by varified Admin ----------------//

        app.put('/users/admin', verifyToken, async (req, res) => {

            const user = req.body;
            const requester = req.decodedEmail;

            if (requester) {

                const requesterAccount = await usersCollection.findOne({ email: requester });

                if (requesterAccount.role === 'admin') {

                    const filter = { email: user.email };

                    const updateDoc = { $set: { role: 'admin' } };

                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);

                }
            }
            else {

                res.status(403).json({ message: 'You do not have access as Admin' });

            }


        });



    }
    finally {
        // await client.close();
    }
}
joztiAutomobiles().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello!jozti Automobiles. hi! Welcome to Heroku')
})

app.listen(port, () => {
    console.log(`listening to jozti Automobiles port, ${port}`)
})