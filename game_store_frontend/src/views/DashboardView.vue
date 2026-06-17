<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p>Bienvenido al sistema Game Store.</p>

    <div class="actions">
      <router-link to="/productos">
        <button>Gestionar Productos</button>
      </router-link>

      <router-link to="/stock">
        <button>Gestionar Stock</button>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 2rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

button {
  padding: 0.75rem 1rem;
  cursor: pointer;
}
</style>