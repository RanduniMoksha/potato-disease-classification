from tensorflow import keras

model = keras.models.load_model(
    "/input/4.keras",
    compile=False,
)

model.export("/output/5")
print("Model exported successfully")