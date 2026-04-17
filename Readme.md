# Price-Stalker

**PriceStalker** is a full-stack web application designed to help users discover better deals for products across multiple online platforms.

Built with **Java (Spring Boot + Maven)** for the backend and **React** for the frontend, the application allows users to search for a product or paste a product URL. It then leverages an **AI-powered service** to identify alternative websites offering lower prices, helping users make smarter purchasing decisions.

---

## 🚀 Features

- Search for products across multiple platforms  
- Paste product URLs for direct comparison  
- AI-powered price recommendation engine  
- Full-stack architecture (Spring Boot + React)  
- Scalable and modular design  

---

## 🛠️ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/LeQuangBui/Price-Stalker.git
cd Price-Stalker# Price-Stalker

PriceStalker is a full-stack web application that helps users find cheaper deals for products across multiple online platforms.

Built with Java (Spring Boot + Maven) for the backend and React for the frontend, the system allows users to search for a product or paste a product URL, then leverages an AI-powered service to suggest alternative websites offering better prices.


## How to use

```
git clone https://github.com/LeQuangBui/Price-Stalker.git
```

### Setting up the Front-End

Make sure Node.js is installed by 
```
node -v
npm -v
```
Or you can download the with this [Link](https://nodejs.org/en/download)
Then you can start the front-end with the following commands
```
cd Price-Stalker/front-end
npm install
npm run dev
```

### Starting up database
Remeber to run the docker file

### Setting up the backend
From `src/main/resources`
create a `application.properties` file and copy all the fields from `application.properties.example` and insert necessary details. Here is the sample:

```
spring.application.name=demo
spring.datasource.url=jdbc:mysql://localhost:3306/price_stalker
spring.datasource.password=root
spring.datasource.username=root
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.jpa.hibernate.ddl-auto=validate
server.port=8000
jwt.secret=N9f348j09f8jjfoi38hg4985jg98ufh8943fj7hf4uyf87as76g34f0837hybf83ufh087y3b4uyf
jwt.expiration=86400000
cors.allowed.origin=http://localhost:3000/
chrome.driver.path=C:\Users\b0xb0x\Downloads\chromedriver-win64\chromedriver-win64
spring.ai.anthropic.api-key={API_KEY}

```
After that we can now run the backend

```
cd Price-stalker
mvn spring-boot:run
```
Or running the `DemonApplication.java`

