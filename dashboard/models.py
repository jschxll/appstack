from django.db import models

class Application(models.Model):
    name = models.CharField(max_length=100)
    ip_address = models.GenericIPAddressField(protocol="ipv4", unpack_ipv4=False, default="127.0.0.1")
    port = models.IntegerField()
    icon = models.FilePathField()
    https = models.BooleanField(default=False)
    use_reverse_proxy = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"name={self.name} https={self.https} ip={self.ip_address}:{self.port} icon_path={self.icon}"