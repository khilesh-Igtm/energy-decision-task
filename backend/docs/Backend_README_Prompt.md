# Role
You are an Expert Technical Writer and Python Backend Engineer.

# Task
Create a comprehensive `README.md` file for the `backend/` directory of the Energy Forecast Dashboard project. 

# Content Requirements
The README must clearly explain:
1. **Overview:** The purpose of the FastAPI backend (fetching Elexon API data, aligning actuals vs. forecasts, calculating errors).
2. **Architecture & File Structure:** A breakdown of the files (e.g., `main.py`, `data_service.py` / `services/`) and what specific logic each handles.
3. **Core Business Logic:**
   - **Elexon API Integration:** Explain how data is fetched from FUELHH and WINDFOR streams.
   - **Forecast Vintage Selection:** Clearly explain the day-ahead decision cutoff logic (e.g., selecting the latest forecast published before the delivery day).
   - **Metrics Calculation:** Briefly explain how MAE, RMSE, and Bias are calculated.
4. **Setup & Run Instructions:** Step-by-step commands to set up the virtual environment, install `requirements.txt`, and run the Uvicorn server. Include how to run tests if applicable.

# Instructions
Create and save the `README.md` file directly in the `backend/` directory. Do NOT output the raw code blocks in the chat response.