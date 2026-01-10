import openpyxl
import json
import datetime
import os

def extract():
    input_file = 'Improved_TDEE_Tracker.xlsx'
    output_file = 'import_data.json'
    
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found.")
        return

    wb = openpyxl.load_workbook(input_file, data_only=True)
    sheet = wb['TDEE']
    
    entries = {}
    
    # We iterate over the rows, looking for date rows (Weight rows)
    # The date is in Column B (index 1)
    # Weight values: Col D-J (indices 3-9)
    # Calorie values are in the PREVIOUS or NEXT row?
    # Based on inspection:
    # Row 19: Cal.
    # Row 20: Weight (Date: 2025-12-20)
    # This suggests Weight row has the date, and the calorie row is immediately above it.
    
    # Actually, let's just collect all rows with Type 'Weight' or 'Cal.'
    weights_by_date = {} # date -> [d1, d2, d3... d7]
    cals_by_date = {}    # date -> [d1, d2, d3... d7]
    
    current_date = None
    
    # Start from row 12 where data begins
    for row in sheet.iter_rows(min_row=12, max_row=500, values_only=True):
        row_date = row[1]
        row_type = row[2]
        
        if isinstance(row_date, datetime.datetime):
            current_date = row_date.date()
            
        if not current_date:
            continue
            
        daily_values = row[3:10]
        
        if row_type == 'Weight':
            weights_by_date[current_date] = daily_values
        elif row_type == 'Cal.':
            cals_by_date[current_date] = daily_values

    # Now flatten into daily entries
    # the date in Col B is Saturday (Day 7)
    all_dates = sorted(list(set(weights_by_date.keys()) | set(cals_by_date.keys())))
    
    import_entries = {}
    
    for saturation_date in all_dates:
        w_vals = weights_by_date.get(saturation_date, [None]*7)
        c_vals = cals_by_date.get(saturation_date, [None]*7)
        
        for i in range(7):
            # i=0 is Day 1, i=6 is Day 7
            delta_days = 6 - i
            actual_date = saturation_date - datetime.timedelta(days=delta_days)
            date_str = actual_date.isoformat()
            
            w = w_vals[i]
            c = c_vals[i]
            
            def safe_float(val):
                if val is None:
                    return None
                try:
                    return float(val)
                except (ValueError, TypeError):
                    return None

            if w is not None or c is not None:
                if date_str not in import_entries:
                    import_entries[date_str] = {
                        "weight": None,
                        "calories": None,
                        "notes": "Imported from Excel",
                        "updatedAt": datetime.datetime.now().isoformat() + "Z"
                    }
                
                w_float = safe_float(w)
                if w_float is not None:
                    import_entries[date_str]["weight"] = w_float
                
                c_float = safe_float(c)
                if c_float is not None:
                    import_entries[date_str]["calories"] = c_float

    # Format for Storage.importData
    data_to_export = {
        "version": 1,
        "exportedAt": datetime.datetime.now().isoformat() + "Z",
        "settings": {
            "weightUnit": "kg",
            "calorieUnit": "cal"
        },
        "entries": import_entries
    }
    
    with open(output_file, 'w') as f:
        json.dump(data_to_export, f, indent=2)
        
    print(f"Successfully exported {len(import_entries)} entries to {output_file}")

if __name__ == "__main__":
    extract()
