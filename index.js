require('dotenv').config();
const {GarminConnect} = require('garmin-connect');
const Strava = require('strava-v3');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const garminUsername = process.env.GARMIN_API_LOGIN
const garminPassword = process.env.GARMIN_API_PASSWORD
const stravaAccessToken = process.env.STRAVA_API_TOKEN

// Инициализация Garmin Connect
const garminConnect = new GarminConnect({
    username: process.env.GARMIN_API_LOGIN,
    password: process.env.GARMIN_API_PASSWORD,
});

// Авторизация в Garmin Connect
async function loginToGarmin() {
    await garminConnect.login(garminUsername, garminPassword);
}

// Получение новых тренировок
async function getNewWorkouts() {
    return await garminConnect.getActivities(0, 1);
}

// Загрузка файла в Strava
async function uploadToStrava(filePath) {
    const fileStream = fs.createReadStream(filePath);

    await Strava.uploads.post({
        access_token: stravaAccessToken,
        data_type: 'fit',
        file: fileStream
    }, (err, payload) => {
        if (err) {
            console.error('Ошибка загрузки в Strava:', err);
        } else {
            console.log('Тренировка успешно загружена в Strava:', payload);
        }
    });
}

// Основная функция
async function main() {
    try {
        await loginToGarmin();
        const workouts = await getNewWorkouts();

        if (workouts.length > 0) {
            const latestWorkout = workouts[0];
            // const zipData = await garminConnect.getActivity({activityId: latestWorkout.activityId});
            // console.log(zipData)
            const  [ activity ]  =  await garminConnect.getActivities ( 0 ,  1 ) ;
            await garminConnect.downloadOriginalActivityData(activity, __dirname)

            // Сохраняем и разархивируем zip-файл
            // const zipPath = path.join(__dirname, `17117815450.zip`); //17117815450, `${activity.activityId}.zip`
            // fs.writeFileSync(zipPath, result);
            let result = fs.readFileSync(`${activity.activityId}.zip`,  (err, data) => {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log(data);
                return data;
            });

            const zip = new AdmZip(result);
            const extractedPath = path.join(__dirname, 'extracted');
            zip.extractAllTo(extractedPath, true);

            // Находим файл .fit и загружаем его в Strava
            const fitFile = fs.readdirSync(extractedPath).find(file => file.endsWith('.fit'));
            if (fitFile) {
                //TODO надо написать проверку, которая проверит по ID существование тренировки в Strava
                //И если совпадений нет, то сохранит
                // await uploadToStrava(path.join(extractedPath, fitFile));
                console.log('Отгрузка в Strava')

                // Удаление непустой папки (Node.js 12.10.0+)
                // fs.rm(extractedPath, { recursive: true, force: true }, (err) => {
                //     if (err) {
                //         console.error('Ошибка при удалении папки:', err);
                //     } else {
                //         console.log('Папка успешно удалена');
                //     }
                // });
                // fs.unlink('17117815450.zip', (err) => {
                //     if (err) {
                //         console.error('Ошибка при удалении файла:', err);
                //     } else {
                //         console.log('Файл успешно удален');
                //     }
                // });

            } else {
                console.error('Файл .fit не найден в архиве.');
            }
        } else {
            console.log('Новых тренировок нет.');
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

main();
