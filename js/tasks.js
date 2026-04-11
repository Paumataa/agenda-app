// ====================================
// TASKS — CRUD
// ====================================

async function getTasks(startDate, endDate) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return [];

    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('time', { ascending: true, nullsFirst: false });

    if (error) { console.error('getTasks error:', error); return []; }
    return data || [];
}

async function createTask(task) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabaseClient
        .from('tasks')
        .insert([{ ...task, user_id: session.user.id }])
        .select()
        .single();

    if (error) { console.error('createTask error:', error); return null; }
    return data;
}

async function updateTask(id, updates) {
    const { data, error } = await supabaseClient
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) { console.error('updateTask error:', error); return null; }
    return data;
}

async function deleteTask(id) {
    const { error } = await supabaseClient
        .from('tasks')
        .delete()
        .eq('id', id);

    if (error) { console.error('deleteTask error:', error); return false; }
    return true;
}
