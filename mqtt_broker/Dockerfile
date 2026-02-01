FROM eclipse-mosquitto:2 
# Create folders (Mosquitto already expects these paths) 
RUN mkdir -p /mosquitto/config /mosquitto/data /mosquitto/log 
# Copy config + password file into the image 
COPY mosquitto/config/mosquitto.conf /mosquitto/config/mosquitto.conf 
COPY mosquitto/config/passwords.txt /mosquitto/config/passwords.txt
# Safer permissions (warnings go away) 
RUN chmod 0700 /mosquitto/config/passwords.txt && chown root:root /mosquitto/config/passwords.txt 
EXPOSE 1883 
CMD ["mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]