package com.unitrack.unitrack_backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class DataMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;

    public DataMigrationRunner(JdbcTemplate jdbcTemplate, PlatformTransactionManager transactionManager) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("Starting Database Migration Check...");

        // Check and migrate assignments
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM information_schema.tables WHERE table_name = 'assignments'", Integer.class);

            if (count != null && count > 0) {
                System.out.println("Migrating data from 'assignments' to 'tasks'...");
                // INSERT + DROP run in a single transaction: PostgreSQL DDL is transactional,
                // so if this process is interrupted partway through, the whole migration rolls
                // back and 'assignments' is left exactly as it was for a clean retry on next boot
                // (instead of the DROP being skipped after rows were already duplicated into 'tasks').
                transactionTemplate.executeWithoutResult(status -> {
                    jdbcTemplate.update(
                        "INSERT INTO tasks (title, subject, due_date, status, type, user_id) " +
                        "SELECT title, subject, due_date, status, 'ASSIGNMENT', user_id FROM assignments"
                    );
                    jdbcTemplate.execute("DROP TABLE assignments CASCADE");
                });
                System.out.println("Migration complete. 'assignments' table dropped.");
            }
        } catch (Exception e) {
            System.err.println("Error migrating assignments: " + e.getMessage());
        }

        // Check and migrate todos
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM information_schema.tables WHERE table_name = 'todos'", Integer.class);

            if (count != null && count > 0) {
                System.out.println("Migrating data from 'todos' to 'tasks'...");
                // completed is boolean. In PostgreSQL, boolean true/false.
                // Case statement to map boolean to string enum
                transactionTemplate.executeWithoutResult(status -> {
                    jdbcTemplate.update(
                        "INSERT INTO tasks (title, description, due_date, due_time, status, type, user_id) " +
                        "SELECT title, description, due_date, due_time, " +
                        "CASE WHEN completed = true THEN 'COMPLETED' ELSE 'PENDING' END, " +
                        "'TODO', user_id FROM todos"
                    );
                    jdbcTemplate.execute("DROP TABLE todos CASCADE");
                });
                System.out.println("Migration complete. 'todos' table dropped.");
            }
        } catch (Exception e) {
            System.err.println("Error migrating todos: " + e.getMessage());
        }

        System.out.println("Database Migration Check finished.");
    }
}
