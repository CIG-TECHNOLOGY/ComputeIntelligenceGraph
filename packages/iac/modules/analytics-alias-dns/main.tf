variable "route53_zone_id" {
  description = "Hosted zone that owns the analytics alias base domain"
  type        = string
}

variable "base_domain" {
  description = "One managed analytics base domain, such as analytics.cig.technology"
  type        = string
}

variable "dashboard_target" {
  description = "Canonical dashboard hostname that receives wildcard analytics traffic"
  type        = string
  default     = "app.cig.lat"
}

resource "aws_acm_certificate" "wildcard" {
  domain_name       = "*.${var.base_domain}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = {
    for option in aws_acm_certificate.wildcard.domain_validation_options : option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }

  zone_id         = var.route53_zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "wildcard" {
  certificate_arn         = aws_acm_certificate.wildcard.arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

resource "aws_route53_record" "wildcard" {
  zone_id         = var.route53_zone_id
  name            = "*.${var.base_domain}"
  type            = "CNAME"
  ttl             = 60
  records         = [trimsuffix(var.dashboard_target, ".")]
  allow_overwrite = true
}

output "wildcard_hostname" {
  description = "Wildcard hostname serving permanent signal-room aliases"
  value       = aws_route53_record.wildcard.fqdn
}

output "certificate_arn" {
  description = "Validated wildcard ACM certificate for the analytics alias zone"
  value       = aws_acm_certificate_validation.wildcard.certificate_arn
}
