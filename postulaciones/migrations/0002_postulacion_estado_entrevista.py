# Generated manually to support selection-stage flow and interviews.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('postulaciones', '0001_initial'),
        ('vacantes', '0002_vacante_creado_por_alter_vacante_estado_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='postulacion',
            name='estado',
            field=models.CharField(choices=[('en_revision', 'En revisión'), ('entrevistado', 'Entrevistado'), ('aprobado', 'Aprobado'), ('rechazado', 'Rechazado')], default='en_revision', max_length=20),
        ),
        migrations.CreateModel(
            name='Entrevista',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateTimeField()),
                ('modalidad', models.CharField(choices=[('virtual', 'Virtual'), ('presencial', 'Presencial'), ('telefonica', 'Telefónica')], max_length=20)),
                ('observaciones', models.TextField(blank=True)),
                ('creada_en', models.DateTimeField(auto_now_add=True)),
                ('entrevistador', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='entrevistas_realizadas', to=settings.AUTH_USER_MODEL)),
                ('postulacion', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='entrevistas', to='postulaciones.postulacion')),
            ],
            options={
                'ordering': ['-fecha', '-creada_en'],
            },
        ),
    ]
