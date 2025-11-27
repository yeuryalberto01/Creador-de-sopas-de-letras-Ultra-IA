import re

# Read the file
with open(r'c:\Users\yeury\Desktop\Proyecto Cenecompuc\SOPA DE LETRAS IA\Creador-de-sopas-de-letras-Ultra-IA\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# STEP 1: Find the line after handleResetLibrary  and insert helper functions
insert_point = None
for i in range(len(lines)):
    if 'const handleResetLibrary' in lines[i]:
        # Find the closing brace of this function
        open_braces = 0
        for j in range(i, len(lines)):
            open_braces += lines[j].count('{')
            open_braces -= lines[j].count('}')
            if open_braces == 0 and '{' in lines[i]:
                insert_point = j + 1
                break
        break

if insert_point:
    helper_code = '''
    // Helper: Delete puzzle with error handling and logging
    const handleDeletePuzzle = async (puzzleId: string, puzzleName: string) => {
        if (!confirm(`¿Borrar "${puzzleName}" permanentemente?`)) {
            console.log('[DELETE] User cancelled delete operation');
            return;
        }
        
        try {
            console.log(`[DELETE] Attempting to delete puzzle: ${puzzleId} (${puzzleName})`);
            await deletePuzzleFromLibrary(puzzleId);
            console.log(`[DELETE] Successfully deleted puzzle: ${puzzleId}`);
            alert("Puzzle eliminado correctamente.");
        } catch (error: any) {
            console.error(`[DELETE] Error deleting puzzle ${puzzleId}:`, error);
            alert("Error al eliminar el puzzle: " + error.message);
        }
    };

    // Helper: Load puzzle with async error handling and logging
    const handleLoadPuzzleAsync = async (record: SavedPuzzleRecord) => {
        if (!record) {
            console.warn("[LOAD] No record provided");
            return;
        }

        if (!window.confirm("¿Cargar este puzzle reemplazará tu trabajo actual. ¿Continuar?")) {
            console.log("[LOAD] User cancelled load operation");
            return;
        }

        try {
            console.log("[LOAD] Loading puzzle:", record.id, record.name);
            handleLoadPuzzle(record); // Call existing sync handler
            console.log("[LOAD] Puzzle loaded successfully");
        } catch (e: any) {
            console.error("[LOAD] Error loading puzzle:", e);
            alert("Error al cargar el archivo (Datos Corruptos): " + e.message);
        }
    };
'''
    lines.insert(insert_point, helper_code)
    print(f"✓ Inserted helper functions at line {insert_point}")

# STEP 2: Find and replace the Load button onClick
for i in range(len(lines)):
    if 'onClick={() => handleLoadPuzzle(p)}' in lines[i]:
        lines[i] = lines[i].replace('onClick={() => handleLoadPuzzle(p)}', 'onClick={() => handleLoadPuzzleAsync(p)}')
        print(f"✓ Replaced Load button onClick at line {i+1}")
        break

# STEP 3: Find and replace the Delete button onClick (this is more complex due to multi-line)
delete_start = None
for i in range(len(lines)):
    if "onClick={() => {" in lines[i] and i + 1 < len(lines) and "if (confirm('¿Borrar puzzle permanentemente?'))" in lines[i+1]:
        delete_start = i
        break

if delete_start:
    # Find the end of this onClick handler
    open_braces = 0
    delete_end = None
    for j in range(delete_start, min(delete_start + 10, len(lines))):
        open_braces += lines[j].count('{')
        open_braces -= lines[j].count('}')
        if open_braces == 0 and '{' in lines[delete_start]:
            delete_end = j
            break
    
    if delete_end:
        # Get the indentation
        indent = ' ' * (len(lines[delete_start]) - len(lines[delete_start].lstrip()))
        new_onclick = f'{indent}onClick={{() => handleDeletePuzzle(p.id, p.name)}}\n'
        # Replace the lines
        lines[delete_start:delete_end+1] = [new_onclick]
        print(f"✓ Replaced Delete button onClick from line {delete_start+1} to {delete_end+1}")

# Write the file
with open(r'c:\Users\yeury\Desktop\Proyecto Cenecompuc\SOPA DE LETRAS IA\Creador-de-sopas-de-letras-Ultra-IA\App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n✅ Successfully patched App.tsx")
print(f"Total lines: {len(lines)}")
